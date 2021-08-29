defmodule OwenCodeWeb.PostLive.Index do
  @moduledoc false
  use OwenCodeWeb, :live_view

  alias OwenCode.Blog
  alias OwenCode.Blog.Post

  @impl OwenCodeWeb
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :posts, list_posts())}
  end

  @impl OwenCodeWeb
  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  defp apply_action(socket, :index, _params) do
    socket
    |> assign(:page_title, "Listing Posts")
    |> assign(:post, nil)
  end

  defp list_posts do
    Blog.list_posts()
  end
end
