defmodule OwenCodeWeb.PageController do
  use OwenCodeWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
