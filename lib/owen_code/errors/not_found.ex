defmodule OwenCode.Errors.NotFound do
  defexception [:message, plug_status: 404]
end
