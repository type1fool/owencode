defmodule Owencode.Blog.Article do
  @enforce_keys ~w(slug author title description body tags published_date)a
  defstruct ~w(slug author title description body tags published_date discussion)a

  def build(_filename, attrs, body) do
    attrs =
      attrs
      |> Map.update!(:published_date, &Date.from_iso8601!/1)
      |> Map.put(:body, body)

    struct!(__MODULE__, attrs)
  end
end
