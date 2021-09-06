defmodule OwenCode.Blog do
  @moduledoc """
  Module for interacting with the blog.
  """
  alias OwenCode.Blog.Post
  alias OwenCode.Exceptions.NotFound

  use NimblePublisher,
    build: Post,
    from: Application.app_dir(:owencode, "priv/posts/**/*.md"),
    as: :posts,
    highlighters: [:makeup_elixir, :makeup_erlang]

  @mix_env Mix.env()
  @tags @posts |> Enum.flat_map(& &1.tags) |> Enum.uniq() |> Enum.sort()

  def list_posts do
    case @mix_env do
      :dev ->
        Enum.sort_by(@posts, & &1.date, {:desc, Date})

      _ ->
        @posts
        |> Enum.filter(& &1.published)
        |> Enum.sort_by(& &1.date, {:desc, Date})
    end
  end

  def list_tags, do: @tags
  def recent_posts, do: Enum.take(list_posts(), 3)

  def get_post_by_id!(id) do
    Enum.find(list_posts(), &(&1.id == id)) ||
      raise NotFound, "post with id=#{id} not found"
  end

  def get_posts_by_tag!(tag) do
    case Enum.filter(list_posts(), &(tag in &1.tags)) do
      [] -> raise NotFound, "posts with tag=#{tag} not found"
      posts -> posts
    end
  end
end
