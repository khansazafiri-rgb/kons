/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.updateRule =
      "id = @request.auth.id || @request.auth.role = 'admin'";
    users.deleteRule =
      "id = @request.auth.id || @request.auth.role = 'admin'";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";
    app.save(users);
  },
);
