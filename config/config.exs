# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
use Mix.Config

config :owen_code,
  ecto_repos: [OwenCode.Repo],
  generators: [binary_id: true]

if Mix.env() == :dev do
  config :git_hooks,
    auto_install: true,
    hooks: [
      pre_commit: [
        tasks: [
          {:mix_task, :format, ["--check-formatted"]}
        ]
      ]
    ]
end

# Configures the endpoint
config :owen_code, OwenCodeWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "S0850wtUfD6ZnssMMp+GCwau0YwOPoc+KN1UUI4pXSbnkVdaD9ensRHDqQ/OKZ3H",
  render_errors: [view: OwenCodeWeb.ErrorView, accepts: ~w(html json), layout: false],
  pubsub_server: OwenCode.PubSub,
  live_view: [signing_salt: "PZMEo1TG"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

config :owen_code, :pow,
  user: OwenCode.Users.User,
  repo: OwenCode.Repo

config :owen_code, :pow_assent,
  providers: [
    github: [
      client_id: System.get_env("GITHUB_CLIENT_ID"),
      client_secret: System.get_env("GITHUB_CLIENT_SECRET"),
      strategy: Assent.Strategy.Github
    ]
  ]

config :surface, :components, [
  {Surface.Components.Form.ErrorTag,
   default_translator: {OwenCodeWeb.ErrorHelpers, :translate_error}}
]

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
