# Local environment setup

Keep credentials in local `.env` files. The repository provides `backend/.env.example` and `mobile/.env.example` as templates. Both `backend/.env` and `mobile/.env` are ignored by Git.

## Create the files

From the repository root in PowerShell, run these commands only if the `.env` files do not already exist:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item mobile/.env.example mobile/.env
```

Edit the files locally. Do not paste real database passwords, JWT secrets, or Cloudinary keys into chat, issues, or commits.

## Backend values

Open `backend/.env` and replace the placeholders:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase PostgreSQL transaction pooler connection string for the development database, usually port 6543. |
| `DIRECT_URL` | Supabase direct or session connection string for the same database, usually port 5432. |
| `JWT_SECRET` | A long, randomly generated secret used to sign login tokens. Keep it private. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | The team's Cloudinary values when testing image uploads. Leave blank until those uploads are needed. |
| `PORT` | `4000` for the local backend. |
| `NODE_ENV` | `development` for local work. |

Copy connection strings from the correct Supabase project rather than guessing hostnames. The password in a database URL must be URL encoded if it contains reserved characters such as `@`, `:`, or `/`.

## Mobile values

Open `mobile/.env`:

```dotenv
EXPO_PUBLIC_API_URL="http://<laptop-wifi-ip>:4000/api/v1"
EXPO_PUBLIC_USE_MOCKS="false"
```

Replace `<laptop-wifi-ip>` with the laptop's Wi-Fi IPv4 address and connect the phone to the same network. Do not use `localhost` for a physical phone. For a deployed backend, use its HTTPS `/api/v1` URL instead. Set `EXPO_PUBLIC_USE_MOCKS="true"` when testing screens without the backend.

Only the API URL and mock switch belong in the mobile file. Expo includes `EXPO_PUBLIC_*` values in the app, so never put database, JWT, or Cloudinary secrets there.

## Check and run

After saving the files, verify that Git ignores them:

```powershell
git check-ignore -v backend/.env mobile/.env
git status --short
```

Restart the backend (`npm run dev` from `backend`) and Expo (`npm start` from `mobile`) after changing environment values. The local backend should answer at `http://localhost:4000/api/v1/health`. Database migrations and seed data should be run only against the intended development database under the team's setup plan.
