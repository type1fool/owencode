defmodule Owencode.Blog do
  alias Owencode.Blog.Article
  alias Owencode.Blog.NotFoundError

  use NimblePublisher,
    build: Article,
    from: Application.app_dir(:owencode, "priv/articles/**/*.md"),
    as: :articles,
    highlighters: ~w(makeup_elixir)a

  @articles Enum.sort_by(@articles, & &1.published_date, {:desc, Date})
  @tags @articles |> Enum.flat_map(& &1.tags) |> Enum.uniq() |> Enum.sort()

  def all_articles, do: @articles
  def all_tags, do: @tags

  def get_by_slug!(slug) do
    Enum.find(all_articles(), &(&1.slug == slug)) ||
      raise NotFoundError, "article not found"
  end

  def get_by_tag!(tag) do
    case Enum.filter(all_articles(), &(tag in &1.tags)) do
      [] -> raise NotFoundError, "no articles with tag #{tag}"
      articles -> articles
    end
  end
end
