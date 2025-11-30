defmodule OwencodeWeb.ArticlesController do
  use OwencodeWeb, :controller
  alias Owencode.Blog

  def index(conn, _params) do
    conn
    |> render("index.html", page_title: "Articles", articles: Blog.all_articles())
  end

  def show(conn, %{"slug" => slug}) do
    article = Blog.get_by_slug!(slug)

    conn
    |> render("show.html", page_title: article.title, article: article)
  end
end
