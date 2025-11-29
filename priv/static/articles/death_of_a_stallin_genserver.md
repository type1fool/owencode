# Death of a Stallin' GenServer

One of the fundamental building blocks in Elixir is the GenServer. It's one of the many abstractions inherited from Erlang, battle-tested and refined over decades. While developers could easily spawn processes in the Erlang virtual machine, managing those processes would quickly become painstaking - death by a thousand paper cuts.

In a typical Elixir application, where an application supervisor is responsible for managing child processes...
