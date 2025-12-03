%{
  slug: "its_a_match",
  title: "It's a Match!",
  description: "Learning how to effectively use ETS isn't easy.",
  author: "Owen Bickford",
  tags: ~w(elixir ets data performance),
  published_date: "2025-12-01"
}
---
If you have been writing Elixir long enough, you may have entered the magical world of Erlang Term Storage (ETS). ETS is one of the many options Elixirists and Erlangers have for storing and retrieving data. When performance is critical and a remote database connection comes at too high a cost, ETS is often an excellent choice. 

ETS particularly shines in scenarios where incoming data must be stored as efficiently as possible. However, peculiarities around its interface present challenges to effectively wielding the tool. The goal of this article is to give you confidence in knowing when to reach for ETS and how to use it to solve real problems.

Before we start slinging ETS tables willy nilly, let's consider some of our options.

## The Toolbox

Most web developers will be familiar with relational databases like Postgres, SQLite, MySQL, and the plethora of SQL and no-SQL technologies. Postgres is the default database for new Phoenix projects, so I suspect you're already somewhat familiar with tools like Ecto, and you may have even crafted a few raw SQL queries. **SQL is a known quantity**, and Ecto has similarities with object relation mapping (ORM) tools in other language ecosystems. Data written to SQL tables is persisted _somewhere_, be it to a local file, a remote file, or a managed service. Many backup mechanisms exist for preventing data loss, and this is non-negotiable for business-critical data. For these reasons, a SQL table is usually a great choice for managing data in your applications.

If you are working with data that does not need to be persisted by _your application_, ETS is useful as a caching layer. For example, you may consume realtime data from a stream which is used to populate user interfaces. If your application is not responsible for persistence, caching in ETS will allow your application to reliably render pages with the most recent data.

Although they are outside of the scope of this article, other mechanisms do exist for storing ephemeral data in Elixir applications. GenServers can contain any shape of data you define, but beware bottlenecks that arise when a GenServer process is overwhelmed by messages. Persistent Term Storage is a great mechanism from Erlang which works well for data that needs to be written once, updated rarely, and read frequently. I have had great success storing static Explorer dataframes with `:persistent_term`, then applying filters and performing transformations on-demand. Erlang also provides atomics and counters, which are valuable for tracking metrics with minimal latency.

Before digging deeper into ETS, it's also worth mentioning Cachex, which provides a friendly interface for managing a simple cache. For cases where you need a simple key-value store, Cachex is probably sufficient. ETS, however, enables more complex filtering for data which tends to be tabular in nature - similar to querying SQL data.

## Setting the Table

If, like me, you have read documentation or books which mention ETS, you may have learned that ETS tables are typically initialized and managed within a GenServer process. This may be appropriate if the volume of change and queries can be managed by a single process. There are use cases when this pattern results in growing message queues, leading to delays processing new data and serving requests. Eventually, so much memory may be consumed that the entire application crashes. In severe circumstances, these performance issues can lead an organization to question whether Elixir and Erlang are up to the task.

Wrapping ETS in a GenServer also tends to add a bit of code complexity, where you need to write multiple `handle_*` callbacks and public API functions. As code changes hands, the patterns in these modules tend to become a bit erratic as we engineers tend to relish reinvention.

What if we could write a simpler module with functions that directly interact with the table?

The first question that arises without the GenServer-ETS pattern is where to put the table. After all, an ETS table must be owned by a process _somewhere_. The Erlang VM will garbage collect (delete) the table soon after its owner process is terminated, after all.

🤔 So, where should we create our ETS tables?

💭 Is there a process which remains alive as long as the application is running?

In Phoenix & Elixir applications with a supervisor, the supervisor's [`start/2`](https://hexdocs.pm/elixir/Application.html#c:start/2) callback may be an ideal place to spin up whatever global tables we need. 

### Table Stakes

Let's imagine a simple Elixir application which monitors room temperatures from some number of sensors. To keep the focus on ETS, I will leave much of the application architecture up to your imagination. However, here are a few relevant decisions:

1. Temperature measurements are streamed into the application from an external service responsible for persistence. If we crash, we can query and/or replay events to get back to a good state.
2. `TemperaturePipeline` uses Broadway to spread message processing across several processes.
3. The application, `Sensitive`, will contain many LiveViews which render data primarily from ETS.

<div class="alert alert-soft alert-info">
NOTE: Module and function docs are omitted here to keep the snippets concise.
</div>

```elixir
defmodule Sensitive.Application do
  def start(_start_type, _args) do
    initialize_tables()
    
    children = [
      SensitiveWeb.Telemetry,
      Sensitive.TemperaturePipeline,
      ...
      SensitiveWeb.Endpoint
    ]
    
    opts = [strategy: :one_for_one, name: Sensitive.Supervisor]
    Supervisor.start_link(children, opts)
  end
  
  defp initialize_tables do
    {:ok, _table} = Sensitive.Rooms.init()
    {:ok, _table} = Sensitive.Temperatures.init()
  end
end
```

```elixir
defmodule Sensitive.Temperatures do
  def init(name \\ __MODULE__) do
    table = :ets.new(name, [:set, :named_table, :public])
    {:ok, table}
  end
end
```

This is the pattern I have found to work well for global tables, where other modules depend on their existence. These tables will exist as long as the application is running.

### Configuration

ETS provides a handful of options which we can use to tailor a table to a particular use case. The first option we will consider is the table type. Perhaps the two most common table types are `:set` and `:ordered_set`.

- `:set` means the table will effectively have primary keys. Each record will be identified by the value in its key position. In ETS, the default key position is `1`, meaning the first element (as opposed to the second element in zero-indexed code). We will be storing tuples for reasons that will become clear later, so "first element" here means the first item in each tuple.
- `:ordered_set` is a `:set` where the rows are sorted by the primary key. If you have data with a unique identifier which can be sorted, this is probably the table type you want to use. While ETS automatically sorts records as they're added, sorting your tuples before inserting or updating may also improve performance.

#### Protection & Privacy

If you are coming from object-oriented land, or you are familiar with security best practices in relational databases, you may be wondering why `Sensitive.Temperatures` was initialized with a `:public` table. ETS does support `:private` and `:protected` access, after all.

Because we expect a high volume of traffic flowing directly into the table from many Elixir processes, we need a public table. Otherwise, the table would need to be owned by a single process, likely a GenServer, and we would face the bottleneck issues discussed earlier. Because the application supervisor owns the tables following this pattern, they effectively need to be public.

This allows for simplicity throughout the application as LiveViews, Controllers, and other processes make calls to whatever public functions we define in `Sensitive.Temperatures`. I find it best to perform type casting and data validation outside of the functions in these table modules.

Caveat that `:public` does mean **any process** in your application could list all ETS tables, locate public ones, and wreak some havoc. This is a tradeoff which may not be acceptible for some data, so factor that into your decisions.

#### Baggage

There are two other table types supported by ETS: `:bag` and `:duplicate_bag`. Both may be useful when your data does not have a unique identifier. However, limitations emerge over the life of these tables. Some ETS functions do not work with these tables, and updates may require three operations: **match**, **delete**, then **insert**.

For example, imagine sensor readings are comprised only of `timestamp`, `label`, `value`, `unit`, where timestamps are represented as nanosecond Unix integers:

```elixir
# {timestamp, label, value, unit}
temperatures = [
  {1764379431857451125, "living room", 72.4, :f},
  {1764379508572910097, "kitchen", 72.8, :f},
  {1764379508572993480, "bedroom", 72.4, :f},
  {1764379508572993480, "patio", 89.23, :f},
]
```

Although timestamps might appear to be a valid unique identifier, it's likely that two or more sensors will report a reading at precisely the same timestamp, even down to the nanosecond. The last write would win and your application would lose data for other readings from the same timestamp. 

When rows have no inherent unique identifier, often you can derive one by hashing some of its elements with `:erlang.phash2/1`. In our scenario, the timestamp + label can act as a unique identifier when hashed. This approach allows you to use an ordered set, which can be improve read & write performance down the road.

```elixir
defp prepend_hash({timestamp, room, _temp, _unit}), do: Tuple.put_elem(tuple, 0, :erlang.phash2({timestamp, room}))

def insert_temperatures(temperatures) do
  rows = Enum.map(temperatures, &prepend_hash/1)
  :ets.insert(Sensitive.Temperatures, rows)
end
```

Hashing each row isn't quite free, but it's a cost you can pay once up front if a bag table comes with too many tradeoffs for your use case.

If this complexity or performance penalty poses a significant challenge, I suggest working with engineers for the data source to discuss adding unique identifiers.

### Filling the Store

Good news! The imaginary temperature data now has unique integer IDs in addition to timestamps and other fields. Thank you, data team!

```elixir
# {reading_id, timestamp, label, value, unit}
temperatures = [
  {1, 1764379431857451125, "living room", 72.4, :f},
  {2, 1764379508572910097, "kitchen", 72.8, :f},
  {3, 1764379508572993480, "bedroom", 72.4, :f},
  {4, 1764379508572993480, "patio", 89.23, :f},
  ...
]
```

Now, we don't need to insert a hash before inserting rows, and we will not need a hash to perform row lookups later.

In the real world, you may receive other kinds of unique identifiers, which are a bit out of scope for this article. The first element in each temperature row is an integer ID. Because we initialized this table as a `:set`, these integers can appear in the table only once, in no particular order. In fact, the key could be a mix of different types. Because they are unsorted, performance issues may surface as the computer jumps to random pointers in memory while writing and reading data.

This brings us to some general guidelines when getting started with ETS:

1. Use one data type as the primary key.
2. Use consistently-sized tuples.
3. Use `:ordered_set` when keys are naturally sortable.

ETS doesn't enforce many rules as you insert data, but these guidelines will keep the code simpler down the road. **There are exceptions to every rule**, but start simple and carve out minimal exceptions when necessary.

In traditional code examples, tuples often contain only 2-3 elements, but tuples can contain many more elements. In ETS, think of tuples as rows in a database, where each element represents a value for a column. Although tuples _could_ have dozens of elements, you may find it increasingly difficult to mentally track what each element represents past ten or so elements.

Remember, ETS is optimized for fast writes and reads. If you find yourself managing a table with wide tuples where only a few values change, consider storing the static data using `:persistent_term`. The best solution will depend entirely on the nature of your data.

### Coherent Concurrency

If you are working with data that comes from multiple processes or is read by multiple processes, you may want to enable some amount concurrency. If we are consuming temperature data through Broadway, for example, we may have dozens of processes inserting rows into the table. We can enable write concurrency to allow efficient insert operations in this case. Write Concurrency works well when various processes are working with distinct rows - in this case, each process is inserting new rows. The ETS documentation recommends using `:auto` for write concurrency in most tables where write concurrency is desired:

```elixir
defmodule Sensitive.Temperatures do
  def init(name \\ __MODULE__) do
    table = :ets.new(name, [:set, :named_table, :public, write_concurrency: :auto])
    {:ok, table}
  end
end
```

This will override the default `false` setting for the table's write concurrency, allowing the Erlang VM to optimize writes at runtime based on its behavior.

For tables _read_ by several processes, read concurrency is also available:

```elixir
defmodule Sensitive.Temperatures do
  def init(name \\ __MODULE__) do
    table = :ets.new(name, [
      :set,
      :named_table,
      :public,
      write_concurrency: :auto,
      read_concurrency: true
    ])
    
    {:ok, table}
  end
end
```

As always, there are tradeoffs when enabling concurrency for reads and/or writes. See the documentation linked at the end of this article for more guidance on wielding these options.

### Concurrent Tests

So far, we have created a `Sensitive.Temperatures` module, which initializes a `Sensitive.Temperatures` table when the application starts. This is a global table, a singleton instance. As our applications grow, it's important to build these components in a way that enables asynchronous testing.

This is why `Sensitive.Temperatures.init/1` takes an optional `name` argument, which defaults to the module name. In tests which interact with this module, we can create random names for the table, taking advantage of async tests.

```elixir
defmodule Sensitive.TemperaturesTest do
  use ExUnit.Case, async: true
  
  setup do
    hash = Enum.take_random(?A..?Z, 6) |> to_string()
    # "YHEBQU"
    table_name = Module.concat(Sensitive.Temperatures, hash)
    # Sensitive.Temperatures.YHEBQU
    {:ok, table} = Sensitive.Temperatures.init(table_name)
    # {:ok, Sensitive.Temperatures.YHEBQU}
    :ok = Process.put({Sensitive.Temperatures, :table}, table)
    
    :ok
  end
  
  describe "insert/1" do
    test "stores temperatures in the table" do
      temperatures = [...]
      Sensitive.Temperatures.insert(temperatures)
      
      stored_temps = Sensitive.Temperatures.all()
      
      for temp <- temperatures do
        assert temp in stored_temps
      end
    end
  end
end
```

The setup block generates a random hash which is appended to the module name, which is passed to `init/1`. This is a pattern I have found useful, but you may find another pattern which works as well or better. Instead of creating a fully random name, the module prefix is helpful for debugging.

Notice that we've added a `{Sensitive.Temperatures, :table}` key to the process dictionary with the value set to the value of `table`. We need to make a change to the module so it can use this value in the test environment.

```elixir
defmodule Sensitive.Temperatures do
  ...
 
  def insert_temperatures(temperatures) do
    rows = Enum.map(temperatures, &prepend_hash/1)
    :ets.insert(table(), rows)
  end
  
  ...
  
  if Mix.env() == :test do
    def table, do: ProcessTree.get({__MODULE__, :table}) || raise "{#{__MODULE__}, :table} must be set"
  else
    def table, do: __MODULE__
  end
end
```

In the `:test` environment, we will require all tests to set `{Sensitive.Temperatures, :table}` in the process dictionary, raising an error when that key is not present or its value is nil. In `:dev` and `:prod` environments, `__MODULE__` will be the table's name since we expect to use the global singleton table.

This is a pattern recommended by Andrea Leopardi for testing GenServers using JB Steadman's excellent ProcessTree package, and I think the pattern extends nicely to global ETS tables.

## Throw Out Your Maps

You may be wondering why we have been using tuples with scalar values (strings, integers, atoms, floats, etc.) instead of maps and structs. ETS requires its rows to be tuples, and it allows any term to be stored a tuple's non-key elements. It would be possible to store temperatures as structs:

```elixir
temperatures = [
  {1, %Temperature{timestamp: 1764379431857451125, label: "living room", value: 72.4, unit: :f}},
  {2, %Temperature{timestamp: 1764379508572910097, label: "kitchen", value: 72.8, unit: :f}},
  {3, %Temperature{timestamp: 1764379508572993480, label: "bedroom", value: 72.4, unit: :f}},
  {4, %Temperature{timestamp: 1764379508572993480, label: "patio", value: 89.23, unit: :f}},
  ...
]
```

At first glance, this is nice. Structs and maps give meaning to each piece of data, which helps our human brains comprehend what we're seeing. However, it makes filtering more difficult and less efficient.

Here's what it looks like to find all readings for a given label when using maps or structs:

```elixir
def find_by_label(label) do
  match_spec = [
    {
      {:"$1", :"$2"},
      [{:==, {:map_get, :"$2", :label}, label}],
      [:"$2"]
    }
  ]
  
  :ets.select(table(), match_spec)
end
```

Welcome to the world of match specs. Many brave developers have fallen on the rocks of the feared Erlang match spec. Packages have been written to abstract away the terror that is the match spec, a confounding but powerful feature of ETS. This is a relatively simple example with one condition, but we need to break down the match spec to see why maps and structs hinder filtering in ETS.

Firstly, we're using `:ets.select/2`, which requires a list of three-element tuples as a match spec. Some comments may illuminate what's going on here:

```elixir
def find_by_label(label) do
  match_spec = [
    {
      # Look for rows which are two-element tuples.
      {:"$1", :"$2"},
      # Use a guard to look for rows where the map's `:label` value equals the given value.
      [{:==, {:map_get, :"$2", :label}, label}],
      # Return the second element from each matching tuple.
      [:"$2"]
    }
  ]
  
  :ets.select(table(), match_spec)
end
```

As engineers, we know we'll soon want to filter rows with a variety of filters. We _could_ create functions for each key, but we love ✨ abstrataction ✨, so we go to the next logical step:

```elixir
def find(filters) do
  match_spec = 
    # Expect a keyword list or map of filters.
    for {key, value} <- filters do
      {
        # Look for rows which are two-element tuples.
        {:"$1", :"$2"},
        # Use a guard to look for rows where the value for `key` equals the given value.
        [{:==, {:map_get, :"$2", key}, value}],
        # Return the second element from each matching tuple.
        [:"$2"]
      }
    end
  
  :ets.select(table(), match_spec)
end
```

Voila! We've conquered ETS! A pay raise is in order! Cheers! 🍻

**Not so fast, young grasshopper**. We have found a solution that technically works, but the performance of this solution is going to be suboptimal at best. That guard element in each spec requres a full table scan per guard. If we pass three filters to this function, it will scan the table three times to find matching records. If you've ever run into a performance issue in a SQL database, it was probably a full table scan caused by inefficient queries, indexes, or other design flaws.

This is why I recommend flattening the data in your ETS tables into tuples.

### The Tuple Tango

With rows of temperature data as flat tuples, we can adjust that `find/1` function to peform much more efficiently:

```elixir
@key_map %{
  id: :"$1",
  timestamp: :"$2",
  label: :"$3",
  value: :"$4",
  unit: :"$5"
}
  
def find(filters) do
  merged_keys = 
    for {key, placeholder} <- @key_map, into: %{} do
      {key, filters[key] || placeholder}
    end
    
  pattern =
    merged_keys
    |> Map.values()
    |> List.to_tuple()
    
  struct = %Temperature{
    id: :"$1",
    timestamp: :"$2",
    label: :"$3",
    value: :"$4",
    unit: :"$5",
  }
  |> Map.merge(merged_keys)
  
  match_spec = [
    {
      # Pattern
      pattern,
      # Guard
      [],
      # Return
      [struct]
    }
  ]
  
  :ets.select(table(), match_spec)
end
```

If match specs weren't already confusing enough, this might seem incomprehensible. Another example might help.

Let's find all readings from the patio in farenheit (`:f`):

```elixir
temperatures = Sensitive.Temperatures.find(label: "patio", unit: :f)
```

Now, I'll add comments to illustrate each variable:

```elixir
def find(filters) do
  merged_keys = 
    for {key, placeholder} <- @key_map, into: %{} do
      {key, filters[key] || placeholder}
    end
    # %{id: :"$1", timestamp: :"$2", label: "patio", value: :"$4", unit: :f}
    
  pattern =
    merged_keys
    |> Map.values()
    |> List.to_tuple()
    # {:"$1", :"$2", "patio", :"$4", :f}
    
  struct = %Temperature{
    id: :"$1",
    timestamp: :"$2",
    label: :"$3",
    value: :"$4",
    unit: :"$5",
  }
  |> Map.merge(merged_keys)
  # %Temperature{id: :"$1", timestamp: :"$2", label: "patio", value: :"$4", unit: :f}
  
  match_spec = [
    {
      pattern,
      [],
      [struct]
    }
  ]
  
  :ets.select(table(), match_spec)
end
```

Instead of using guards, we rely on the power of pattern matching. This allows the Erlang VM to much more efficiently find rows without applying guard functions on each row.

Notice that the match spec tends to be formatted with newlines in my examples. To my mind, this makes the code clearer than the condensed formatting found in the ETS docs, especially for more complex specs.

```elixir
match_spec = [
  {{:"$1", :"$2", "patio", :"$4", :f}, [],
   [%Temperature{id: :"$1", timestamp: :"$2", label: "patio", value: :"$4", unit: :f}]}
]

:ets.select(table(), match_spec)
```

## When In List

Aside from figuring out where to intialize tables without GenServers, one problem that pagued me with ETS had been filtering rows with a list of possible matches for an element. In SQL, think of `WHERE col IN [val1, val2, ...]`. In the documentation and books I read, I could not find a single example of how to solve this problem using ETS. Surely someone had written about it somewhere, but my searching turned up nothing.

We have finally arrived at the original and primary impetus for this article. In hindsight, it's obvious and simple.

Notice how a match spec is a list of three element tuples? That's the trick. To dial down the complexity, the next example demonstrates how to filter a table based on possible values for an element in each row:

```elixir
def find_by_labels(labels) do
  match_spec = 
    for label <- labels do
      {
        # Pattern
        {:"$1", :"$2", label, :"$4", :"$5"},
        # Guard
        [],
        # Return
        [%Temperature{
          id: :"$1",
          timestamp: :"$2",
          label: label,
          value: :"$4",
          unit: :"$5",
        }]
      }
    end
    
  :ets.select(table(), match_spec)
end
```

Knowing that each row's third element is the label, we build a match spec using placeholders for all elements except for the third element in the tuple.

searching for readings for the patio and living room, we can now make one function call instead of performing lookups for each label:

```elixir
temperatures = Sensitive.Temperatures.find_by_labels(["patio", "living room"])
```

The generated match spec would look like this:

```elixir
match_spec = [
  {
    {:"$1", :"$2", "patio", :"$4", :"$5"},
    [],
    [%Temperature{
      id: :"$1",
      timestamp: :"$2",
      label: "patio",
      value: :"$4",
      unit: :"$5",
    }]
  },
  {
    {:"$1", :"$2", "living room", :"$4", :"$5"},
    [],
    [%Temperature{
      id: :"$1",
      timestamp: :"$2",
      label: "living room",
      value: :"$4",
      unit: :"$5",
    }]
  },
]
```

You may already be thinking of ways to combine the abstractions in `find/1` and `find_by_labels/1`. I will leave that as a problem you can solve if you desire.

Remember, though, that premature optimization is a real problem. If you can get by with a handful of filter functions for a while, and there's no real pain in using them, it may be wise to resist the urge to abstract filtering into a single function.

## `:ets.tab2file/2`

Now that I have dumped my ephemeral thoughts to storage, it's time to call it a day. I hope you enjoyed reading this article, maybe even learned something new. There is more I want to write about ETS, GenServers, Elixir, and topics in this realm.

It is a labor of love to share lessons I have learned with a community that shared so much with me. Thank you.

## Further Reading

- https://www.erlang.org/doc/apps/stdlib/ets.html
- https://www.erlang.org/doc/apps/erts/erlang.html#phash2/1
- https://andrealeopardi.com/posts/async-tests-in-elixir/
- https://hexdocs.pm/process_tree/ProcessTree.html
- https://www.erlang.org/doc/apps/erts/atomics.html
- https://www.erlang.org/doc/apps/erts/counters.html
- https://hexdocs.pm/cachex/overview.html
- https://hexdocs.pm/elixir/lists-and-tuples.html#tuples
