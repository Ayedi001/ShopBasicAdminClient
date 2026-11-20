export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  PREPARING: "En préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Demandé",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
  RECEIVED: "Reçu",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export const RETURN_TYPE_LABELS: Record<string, string> = { RETURN: "Retour", EXCHANGE: "Échange" };

export const RETURN_REASON_LABELS: Record<string, string> = {
  WRONG_SIZE: "Mauvaise taille",
  DEFECTIVE: "Article défectueux",
  NOT_AS_DESCRIBED: "Non conforme à la description",
  CHANGED_MIND: "Changement d'avis",
  WRONG_ITEM: "Mauvais article reçu",
  OTHER: "Autre",
};

export const REVIEW_STATUS_LABELS: Record<string, string> = { PENDING: "En attente", APPROVED: "Publié", REJECTED: "Refusé" };

export const PRODUCT_STATUS_LABELS: Record<string, string> = { DRAFT: "Brouillon", PUBLISHED: "Publié", ARCHIVED: "Archivé" };

export const AUDIENCE_LABELS: Record<string, string> = { MEN: "Homme", WOMEN: "Femme", KIDS: "Enfant", UNISEX: "Unisexe", BABY: "Bébé" };

export const SEASON_LABELS: Record<string, string> = { ALL: "Toutes saisons", SPRING: "Printemps", SUMMER: "Été", AUTUMN: "Automne", WINTER: "Hiver" };

export const FIT_LABELS: Record<string, string> = { SLIM: "Ajustée", REGULAR: "Regular", OVERSIZED: "Oversize", RELAXED: "Décontractée" };

export const SIZE_TYPE_LABELS: Record<string, string> = {
  CLOTHING: "Vêtements (XS–XXL)",
  SHOES: "Pointures",
  AGE: "Âge (enfant)",
  ONE_SIZE: "Taille unique",
  OTHER: "Autre",
};

export const IMAGE_VIEW_LABELS: Record<string, string> = { FRONT: "Face", BACK: "Dos", SIDE: "Profil", DETAIL: "Détail", OTHER: "Autre" };

export const STOCK_TYPE_LABELS: Record<string, string> = {
  INITIAL: "Stock initial",
  RESTOCK: "Réassort",
  ADJUSTMENT: "Ajustement",
  DAMAGED: "Article endommagé",
  CORRECTION: "Correction d'inventaire",
  ORDER_CONFIRMED: "Commande confirmée",
  ORDER_CANCELLED: "Commande annulée",
  RETURN: "Retour client",
  EXCHANGE_OUT: "Sortie échange",
};

export const ROLE_LABELS: Record<string, string> = { OWNER: "Propriétaire", MANAGER: "Gérant", EMPLOYEE: "Employé", CUSTOMER: "Client" };

export const DISCOUNT_TYPE_LABELS: Record<string, string> = { PERCENT: "Pourcentage", FIXED: "Montant fixe" };

export const SCOPE_LABELS: Record<string, string> = {
  ALL: "Tout le catalogue",
  PRODUCTS: "Produits choisis",
  CATEGORIES: "Catégories",
  SUBCATEGORIES: "Sous-catégories",
};

export const HOME_SECTION_LABELS: Record<string, string> = {
  HERO: "Bannière principale (carrousel)",
  CATEGORY_TILES: "Tuiles catégories",
  COLLECTIONS: "Collections",
  NEW_ARRIVALS: "Nouveautés",
  BEST_SELLERS: "Meilleures ventes",
  ON_SALE: "Promotions",
  FEATURED: "Produits mis en avant",
  PROMO_TEXT: "Bandeau promotionnel",
  RECENTLY_VIEWED: "Vus récemment",
};

export const CONTENT_PAGE_LABELS: Record<string, string> = {
  about: "À propos",
  contact: "Contact",
  faq: "FAQ",
  shipping: "Livraison",
  returns: "Retours et échanges",
  privacy: "Confidentialité",
  terms: "Conditions générales",
};

export const LOCALE_LABELS_FR: Record<string, string> = { fr: "Français", ar: "Arabe", en: "Anglais" };

/** French messages for the shared validation keys returned by the API. */
export const ERR_FR: Record<string, string> = {
  "err.required": "Ce champ est obligatoire.",
  "err.tooLong": "Texte trop long.",
  "err.phone": "Numéro de téléphone invalide (8 chiffres).",
  "err.email": "Adresse e-mail invalide.",
  "err.passwordShort": "8 caractères minimum.",
  "err.passwordWeak": "Utilisez des lettres et des chiffres.",
  "err.passwordMismatch": "Les mots de passe ne correspondent pas.",
  "err.generic": "Une erreur est survenue. Réessayez.",
  "err.network": "Problème de connexion. Vérifiez votre réseau.",
};

export const tFr = (key: string) => ERR_FR[key] ?? (key.startsWith("err.") ? ERR_FR["err.generic"] : key);
