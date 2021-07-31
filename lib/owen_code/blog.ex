defmodule OwenCode.Blog do
  alias OwenCode.Blog.Post
  alias OwenCode.Errors.NotFound

  use NimblePublisher,
    build: Post,
    from: Application.app_dir(:owen_code, "priv/posts/**/*.md"),
    as: :posts,
    highlighters: [:makeup_elixir, :makeup_erlang]

  @posts Enum.sort_by(@posts, & &1.date, {:desc, Date})
  @tags @posts |> Enum.flat_map(& &1.tags) |> Enum.uniq() |> Enum.sort()

  def all_posts, do: @posts

  def all_tags, do: @tags

  def recent_posts(count \\ 4), do: Enum.take(all_posts(), count)

  def get_post_by_id!(id) do
    Enum.find(all_posts(), &(&1.id == id)) ||
      raise NotFound, "post with id=#{id} not found"
  end

  def get_posts_by_tag!(tag) do
    case Enum.filter(all_posts(), &(tag in &1.tags)) do
      [] -> raise NotFound, "posts with tag=#{tag} not found"
      posts -> posts
    end
  end
end
