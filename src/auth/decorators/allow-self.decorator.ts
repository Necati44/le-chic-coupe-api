import { SetMetadata } from '@nestjs/common';
export const ALLOW_SELF_KEY = 'allow_self_param';
/**
 * Permet l'accès si req.appUser.id === req.params[paramName].
 * Utile pour autoriser la modification de ses données personnelles uniquement pour les CUSTOMERS
 * @param paramName Nom du paramètre de route contenant l'id du user (par défaut "id").
 */
export const AllowSelf = (paramName: string = 'id') =>
  SetMetadata(ALLOW_SELF_KEY, paramName);
