# Le Chic Coupé – API (NestJS)

API du projet **Le Chic Coupé**. Stack principale : **NestJS 11**, **Prisma 6**, **PostgreSQL**, **Firebase Auth** (émulateur en local).  
NodeJS recommandé : **v24.2.0**.

---

## Sommaire
- [Prérequis](#prérequis)
- [Configuration de l’environnement](#configuration-de-lenvironnement)
- [Démarrage rapide](#démarrage-rapide)
- [Vérifications rapides](#vérifications-rapides)
- [Dépannage](#dépannage)
- [Notes sur les environnements](#notes-sur-les-environnements)
- [Scripts utiles](#scripts-utiles)
- [Licence](#licence)

---

## Prérequis

- **Node.js** v24.2.0 (ou compatible 22+)
- **npm** (ou pnpm/yarn si le repo le prévoit)
- **Docker** + **Docker Compose**
- **Firebase CLI** (pour l’émulateur Auth)
  - Installation : `npm i -g firebase-tools`  

---

## Configuration de l’environnement

1. **Cloner le dépôt** puis installer les dépendances :
   ```bash
   npm install
```

2. **Variables d’environnement**
   Copie `.env.example` en `.env` (ou crée-le) et adapte si besoin :

   ```bash
   # Base de données locale (doit correspondre à ton docker-compose.yml)
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lechiccoupe"

   # Port HTTP de l'API Nest
   PORT=3000

   # Important : redirige le SDK Admin vers l'émulateur Firebase Auth
   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

   # (Optionnel) d’autres variables propres au projet…
   NODE_ENV=development
   ```

> ℹ️ `FIREBASE_AUTH_EMULATOR_HOST` **doit** être défini pour que tes vérifications de token Firebase se fassent contre l’émulateur (et non la prod) pendant le dev local.

---

## Démarrage rapide

1. **Lancer Firebase Auth Emulator**
   Depuis la racine du projet (où se trouve `firebase.json`, si présent) :

   ```bash
   # Soit via installation globale…
   firebase emulators:start --only auth
   # …ou en one-shot :
   npx firebase-tools@latest emulators:start --only auth
   ```

   Par défaut Auth écoute sur **localhost:9099**. Laisse l’émulateur tourner dans ce terminal.

2. **Démarrer la base de données locale (Docker)**
   Dans un **deuxième terminal**, à la racine du repo :

   ```bash
   docker compose up -d
   ```

   Cela lance PostgreSQL (et tout autre service défini dans `docker-compose.yml`).

3. **Préparer puis lancer l’API**
   Dans un **troisième terminal** :

   ```bash
   npm run migrate:dev     # crée/maj le schéma Prisma
   npm run auth:seed       # jeux de données (utilisateurs) dans l'émulateur Firebase Auth
   npm run dev             # démarre NestJS en watch
   ```

> À ce stade, l’API est accessible sur **[http://localhost:3000](http://localhost:3000)** (sauf si `PORT` est modifié).

---

## Vérifications rapides

* **DB** : `docker ps` doit afficher le conteneur PostgreSQL en `Up`.
* **Emulateur Auth** : la console doit montrer un service **auth** actif sur `localhost:9099`.
* **API** : la console Nest affiche `Listening on port 3000` (ou le port que tu as défini).

---

## Dépannage

* **Port 9099 occupé** (émulateur)

  * Change le port dans `firebase.json` ou stoppe le service en conflit.
  * Assure-toi que `.env` pointe bien vers `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` (ou ton port custom).

* **Connexion DB échoue**

  * Vérifie `DATABASE_URL` et que `docker compose up -d` a bien démarré PostgreSQL.
  * Pour repartir propre : `docker compose down -v` (⚠️ supprime les volumes).

* **`auth:seed` échoue**

  * Vérifie que l’émulateur est bien **démarré avant** d’exécuter le seed.
  * Assure-toi que `FIREBASE_AUTH_EMULATOR_HOST` est correctement défini (dans `.env` ou l’environnement du shell où tu lances le script).

* **Le code touche la prod Firebase par erreur**

  * En local, **ne mets pas** de variables d’Admin SDK pointant vers des identifiants de prod.
  * Garde `FIREBASE_AUTH_EMULATOR_HOST` défini et ne fournis aucun service account localement.

---

## Notes sur les environnements

* **Local (dev)**

  * Authentification via **Firebase Auth Emulator** (pas besoin de compte Google réel).
  * Les utilisateurs créés par `npm run auth:seed` sont **locaux** à l’émulateur.

* **Production**

  * Le service Firebase (Admin SDK) utilise un compte de service (JSON) **et** la variable `FIREBASE_AUTH_EMULATOR_HOST` **ne doit pas** être définie.
  * La base de données n’est plus celle du `docker-compose` local.

---

## Scripts utiles

Les plus utilisés :

```bash
npm run migrate:dev   # Prisma migrate (dev) + generate
npm run auth:seed     # Seed de l'émulateur Firebase Auth (utilisateurs)
npm run dev           # Démarrage NestJS en watch mode
```

Éventuellement :

```bash
npm run format        # Formatage
npm run lint          # Lint
npm run test          # Tests unitaires
npm run test:e2e      # Tests E2E
```

