// types/express.d.ts
import { JwtPayload } from '../src/auth/types/jwt-payload.type'; // adapte le chemin

declare global {
    namespace Express {
      interface User extends JwtPayload {} // ✅ OK
      interface Request {
        user?: User; // ✅ inutile de mettre `| undefined` car `?` le fait déjà
      }
    }
  }
  
