defmodule OwencodeWeb.PageController do
  use OwencodeWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
