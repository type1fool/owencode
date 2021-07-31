defmodule OwenCodeWeb.PostLive do
  use OwenCodeWeb, :live_view
  alias OwenCode.Blog

  @impl true
  def mount(_params, _session, socket) do
    posts = Blog.all_posts()
    tags = Blog.all_tags()
    {:ok, assign(socket, posts: posts, tags: tags)}
  end
end
