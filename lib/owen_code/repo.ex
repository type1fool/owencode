defmodule OwenCode.Repo do
  use Ecto.Repo,
    otp_app: :owen_code,
    adapter: Ecto.Adapters.Postgres
end
