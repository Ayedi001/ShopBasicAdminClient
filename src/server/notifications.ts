import { prisma, type Tx } from "./db";
import { logger } from "./logger";

/**
 * Customer notifications. Always stored in-app; additional channels
 * (email, SMS, WhatsApp...) can be plugged in by registering a
 * NotificationChannel — none is required for the shop to work.
 */
export type NotificationPayload = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  email?: string;
  phone?: string;
};

export interface NotificationChannel {
  name: string;
  send(payload: NotificationPayload): Promise<void>;
}

const channels: NotificationChannel[] = [];

export function registerChannel(channel: NotificationChannel) {
  channels.push(channel);
}

// Optional generic webhook channel (e.g. to forward to an SMS/email provider or automation tool)
if (process.env.NOTIFY_WEBHOOK_URL) {
  registerChannel({
    name: "webhook",
    async send(payload) {
      await fetch(process.env.NOTIFY_WEBHOOK_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
  });
}

type Templates = Record<string, Record<"fr" | "ar" | "en", { title: string; body: string }>>;

const TEMPLATES: Templates = {
  ORDER_PLACED: {
    fr: { title: "Commande {number} reçue", body: "Merci ! Nous vous appellerons pour confirmer votre commande." },
    ar: { title: "تم استلام الطلب {number}", body: "شكرًا! سنتصل بك لتأكيد طلبك." },
    en: { title: "Order {number} received", body: "Thank you! We will call you to confirm your order." },
  },
  ORDER_CONFIRMED: {
    fr: { title: "Commande {number} confirmée", body: "Votre commande est confirmée et sera bientôt préparée." },
    ar: { title: "تم تأكيد الطلب {number}", body: "تم تأكيد طلبك وسيتم تجهيزه قريبًا." },
    en: { title: "Order {number} confirmed", body: "Your order is confirmed and will be prepared soon." },
  },
  ORDER_PREPARING: {
    fr: { title: "Commande {number} en préparation", body: "Nous préparons vos articles." },
    ar: { title: "الطلب {number} قيد التجهيز", body: "نحن نجهّز منتجاتك." },
    en: { title: "Order {number} is being prepared", body: "We are preparing your items." },
  },
  ORDER_SHIPPED: {
    fr: { title: "Commande {number} expédiée", body: "Votre colis est en route.{extra}" },
    ar: { title: "تم شحن الطلب {number}", body: "طردك في الطريق.{extra}" },
    en: { title: "Order {number} shipped", body: "Your parcel is on its way.{extra}" },
  },
  ORDER_DELIVERED: {
    fr: { title: "Commande {number} livrée", body: "Merci pour votre achat ! Vous pouvez laisser un avis sur vos articles." },
    ar: { title: "تم تسليم الطلب {number}", body: "شكرًا على شرائك! يمكنك تقييم منتجاتك." },
    en: { title: "Order {number} delivered", body: "Thanks for your purchase! You can now review your items." },
  },
  ORDER_CANCELLED: {
    fr: { title: "Commande {number} annulée", body: "Votre commande a été annulée.{extra}" },
    ar: { title: "تم إلغاء الطلب {number}", body: "تم إلغاء طلبك.{extra}" },
    en: { title: "Order {number} cancelled", body: "Your order has been cancelled.{extra}" },
  },
  RETURN_UPDATED: {
    fr: { title: "Demande {number} : {status}", body: "Votre demande de retour/échange a été mise à jour." },
    ar: { title: "الطلب {number}: {status}", body: "تم تحديث طلب الإرجاع/الاستبدال." },
    en: { title: "Request {number}: {status}", body: "Your return/exchange request was updated." },
  },
  REVIEW_REPLY: {
    fr: { title: "La boutique a répondu à votre avis", body: "Consultez la réponse sur la page du produit." },
    ar: { title: "ردّ المتجر على رأيك", body: "اطلع على الرد في صفحة المنتج." },
    en: { title: "The shop replied to your review", body: "See the reply on the product page." },
  },
};

export async function notify(
  tx: Tx,
  userId: string,
  type: keyof typeof TEMPLATES,
  vars: Record<string, string>,
  link?: string,
) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { locale: true, email: true, phone: true } });
  const locale = (user?.locale as "fr" | "ar" | "en") ?? "fr";
  const tpl = TEMPLATES[type][locale] ?? TEMPLATES[type].fr;
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  const payload: NotificationPayload = {
    userId,
    type,
    title: fill(tpl.title),
    body: fill(tpl.body),
    link,
    email: user?.email,
    phone: user?.phone,
  };
  await tx.notification.create({ data: { userId, type, title: payload.title, body: payload.body, link } });
  // External channels run after the response and never break the business operation
  for (const ch of channels) {
    ch.send(payload).catch((e) => logger.warn("notification channel failed", { channel: ch.name, error: e }));
  }
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
