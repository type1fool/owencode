defmodule OwenCodeWeb.PostLive.Show do
  @moduledoc false
  use OwenCodeWeb, :live_view

  alias OwenCode.Blog

  @impl true
  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_params(%{"id" => id}, _, socket) do
    post = Blog.get_post_by_id!(id)

    {:noreply,
     socket
     |> assign(:page_title, post.title)
     |> assign(:post, post)}
  end

  defp page_title(:show), do: "Show Post"
  defp page_title(:edit), do: "Edit Post"
end
