defmodule OwenCode.Repo do
  use Ecto.Repo,
    otp_app: :owencode,
    adapter: Ecto.Adapters.Postgres
end
