import type { DefaultJWT } from "next-auth/jwt";

import type { RoleName } from "@/db/generated/enums";

/**
 * Module augmentation so that `session.user.id` and `session.user.roles`
 * are typed end to end (§8). Without this, every consumer would need an
 * unsafe cast to read the fields the callbacks in `config.ts` attach.
 *
 * The `DefaultJWT` import is load-bearing: TypeScript will not accept an
 * augmentation for a module it has not otherwise been asked to resolve.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      roles: RoleName[];
    };
  }

  interface User {
    roles?: RoleName[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    roles: RoleName[];
  }
}

export {};
