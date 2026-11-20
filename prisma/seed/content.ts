type Page = { title: string; body: string };
export const PAGES: Record<string, Record<"fr" | "ar" | "en", Page>> = {
  about: {
    fr: {
      title: "À propos de Maison Nour",
      body: `Maison Nour est une boutique de prêt-à-porter tunisienne fondée avec une idée simple : proposer des vêtements de qualité, bien coupés et durables, à des prix justes.

## Notre histoire
Tout a commencé dans un petit atelier de Tunis. Aujourd'hui, nous habillons toute la famille — femme, homme et enfant — avec une sélection pensée pour le climat et le style de vie méditerranéens.

## Nos engagements
- **Qualité** : des matières choisies avec soin (coton biologique, lin, laine mérinos).
- **Savoir-faire local** : une grande partie de nos pièces sont fabriquées en Tunisie.
- **Proximité** : chaque commande est confirmée par téléphone par notre équipe.

Merci de votre confiance.`,
    },
    ar: {
      title: "من نحن",
      body: `ميزون نور متجر ملابس تونسي تأسس بفكرة بسيطة: تقديم ملابس عالية الجودة ومتينة بأسعار عادلة.

## التزاماتنا
- **الجودة**: خامات مختارة بعناية.
- **الصناعة المحلية**: أغلب قطعنا مصنوعة في تونس.
- **القرب**: نؤكد كل طلب عبر الهاتف.`,
    },
    en: {
      title: "About Maison Nour",
      body: `Maison Nour is a Tunisian fashion store founded on a simple idea: quality, well-cut and durable clothing at fair prices.

## Our commitments
- **Quality**: carefully selected materials (organic cotton, linen, merino wool).
- **Local craftsmanship**: most of our pieces are made in Tunisia.
- **Personal service**: every order is confirmed by phone by our team.`,
    },
  },
  contact: {
    fr: {
      title: "Contact",
      body: `Notre équipe vous répond du lundi au samedi, de 9h à 19h.

Vous pouvez nous appeler, nous écrire sur WhatsApp ou utiliser le formulaire ci-dessous. Pour toute question sur une commande, indiquez votre numéro de commande.`,
    },
    ar: { title: "اتصل بنا", body: "فريقنا في خدمتكم من الإثنين إلى السبت، من 9 صباحًا إلى 7 مساءً. يمكنكم الاتصال بنا أو مراسلتنا عبر واتساب أو عبر النموذج أدناه." },
    en: { title: "Contact", body: "Our team is available Monday to Saturday, 9am to 7pm. Call us, message us on WhatsApp or use the form below." },
  },
  faq: {
    fr: {
      title: "Questions fréquentes",
      body: `## Comment passer commande ?
Ajoutez vos articles au panier, connectez-vous ou créez un compte, puis indiquez votre adresse de livraison. Notre équipe vous appelle ensuite pour confirmer la commande.

## Comment puis-je payer ?
Le paiement se fait à la livraison, en espèces, auprès du livreur. Aucun paiement en ligne n'est demandé.

## Quels sont les délais de livraison ?
En général 24 à 72 heures selon votre gouvernorat, après confirmation téléphonique.

## Puis-je échanger une taille ?
Oui. Depuis votre compte, ouvrez la commande livrée et cliquez sur « Demander un retour / échange ». Le délai est indiqué dans notre politique de retours.

## Comment suivre ma commande ?
Depuis « Mes commandes » dans votre compte, ou via la page « Suivre une commande » avec votre numéro de commande et votre téléphone.`,
    },
    ar: {
      title: "الأسئلة الشائعة",
      body: `## كيف أطلب؟
أضف المنتجات إلى السلة، سجّل الدخول ثم أدخل عنوانك. سيتصل بك فريقنا لتأكيد الطلب.

## كيف أدفع؟
الدفع نقدًا عند الاستلام.

## هل يمكنني استبدال المقاس؟
نعم، من حسابك في صفحة الطلب المستلم.`,
    },
    en: {
      title: "Frequently asked questions",
      body: `## How do I order?
Add items to your bag, sign in or create an account and enter your delivery address. Our team will call you to confirm.

## How do I pay?
Cash on delivery to the courier. No online payment is required.

## Can I exchange a size?
Yes — open the delivered order in your account and click "Request a return / exchange".`,
    },
  },
  shipping: {
    fr: {
      title: "Livraison",
      body: `## Zones et tarifs
Nous livrons dans les 24 gouvernorats de Tunisie. Les frais dépendent de votre gouvernorat et sont affichés avant la confirmation de votre commande. La livraison est **offerte** au-delà du montant indiqué sur le site.

## Délais
24 à 72 heures ouvrées après la confirmation téléphonique de votre commande.

## Fonctionnement
1. Vous passez commande sur le site.
2. Nous vous appelons pour confirmer.
3. Nous préparons votre colis et le confions à notre partenaire de livraison.
4. Vous payez à la réception.

## Retrait en boutique
Vous pouvez aussi choisir le retrait gratuit en boutique.`,
    },
    ar: { title: "التوصيل", body: "نوصل إلى كامل ولايات الجمهورية خلال 24 إلى 72 ساعة بعد تأكيد الطلب هاتفيًا. تظهر مصاريف التوصيل قبل تأكيد الطلب، والتوصيل مجاني فوق المبلغ المحدد." },
    en: { title: "Delivery", body: "We deliver across all 24 Tunisian governorates within 24 to 72 hours after phone confirmation. Fees are shown before you confirm; delivery is free above the threshold shown on the site." },
  },
  returns: {
    fr: {
      title: "Retours et échanges",
      body: `## Échange de taille
Vous disposez de **30 jours** après la livraison pour demander un échange de taille, sous réserve de disponibilité.

## Retour
Vous disposez de **14 jours** après la livraison pour retourner un article. Le remboursement est effectué manuellement, en espèces ou par virement, après réception et contrôle de l'article.

## Conditions
- Article non porté, non lavé, avec ses étiquettes.
- Les sous-vêtements et maillots de bain ne sont ni repris ni échangés pour des raisons d'hygiène.

## Comment faire ?
Depuis votre compte, ouvrez la commande livrée et cliquez sur « Demander un retour / échange ». Notre équipe vous appellera pour organiser la reprise.`,
    },
    ar: { title: "الإرجاع والاستبدال", body: "يمكنك طلب استبدال المقاس خلال 30 يومًا وإرجاع المنتج خلال 14 يومًا من الاستلام، بشرط أن يكون المنتج غير مستعمل ومع بطاقاته." },
    en: { title: "Returns & exchanges", body: "You can request a size exchange within 30 days and a return within 14 days of delivery, provided the item is unworn with its tags. Refunds are handled manually." },
  },
  privacy: {
    fr: {
      title: "Politique de confidentialité",
      body: `Nous collectons uniquement les données nécessaires au traitement de vos commandes : nom, téléphone, e-mail et adresse de livraison.

## Utilisation
- Confirmer et livrer vos commandes.
- Vous contacter au sujet de vos commandes et demandes.

## Partage
Votre nom, téléphone et adresse sont communiqués à la société de livraison uniquement pour livrer votre colis. Nous ne vendons jamais vos données.

## Vos droits
Conformément à la loi organique n° 2004-63 sur la protection des données personnelles, vous pouvez demander l'accès, la rectification ou la suppression de vos données en nous contactant.`,
    },
    ar: { title: "سياسة الخصوصية", body: "نجمع فقط البيانات الضرورية لمعالجة طلباتك ولا نبيع بياناتك أبدًا. يمكنك طلب الاطلاع على بياناتك أو تعديلها أو حذفها." },
    en: { title: "Privacy policy", body: "We only collect the data needed to process your orders and never sell your data. You may request access, correction or deletion of your data at any time." },
  },
  terms: {
    fr: {
      title: "Conditions générales de vente",
      body: `## Commandes
Toute commande passée sur le site est confirmée par téléphone avant préparation. La boutique se réserve le droit d'annuler une commande en cas d'indisponibilité ou d'impossibilité de joindre le client.

## Prix
Les prix sont indiqués en dinars tunisiens (TND), toutes taxes comprises. Les frais de livraison sont affichés avant la validation de la commande.

## Paiement
Le paiement s'effectue à la livraison, en espèces.

## Livraison, retours et échanges
Voir nos pages Livraison et Retours et échanges.`,
    },
    ar: { title: "الشروط العامة للبيع", body: "يتم تأكيد كل طلب عبر الهاتف. الأسعار بالدينار التونسي شاملة الضرائب. الدفع عند الاستلام." },
    en: { title: "Terms and conditions", body: "Every order is confirmed by phone. Prices are in Tunisian dinars (TND), taxes included. Payment is made in cash on delivery." },
  },
};
