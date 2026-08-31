import { formatCHF } from '../lib/swiss';
import { frontendPath } from '../lib/urls';

// Support types for templates
interface EmailUser {
  firstName: string;
  lastName: string;
  email: string;
}

interface OrderItem {
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPriceChf: number;
  totalChf: number;
}

interface EmailOrder {
  orderNumber: string;
  totalChf: number;
  subtotalChf: number;
  vatAmountChf: number;
  shippingCostChf: number;
  discountAmountChf: number;
  paymentMethod: string;
  items: OrderItem[];
  invoiceUrl?: string | null;
}

interface QuoteItem {
  productName: string;
  quantity: number;
  note?: string | null;
}

interface EmailQuote {
  quoteNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  company?: string | null;
  projectDesc: string;
  roomDimensions?: {
    width_m: number;
    height_m: number;
    length_m: number;
  } | null;
  items: QuoteItem[];
}

interface ContactMessage {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}

/**
 * Shared Postmark send wrapper
 */
async function sendEmail({
  to,
  subject,
  htmlBody,
  attachments,
}: {
  to: string;
  subject: string;
  htmlBody: string;
  attachments?: { name: string; content: Buffer; contentType: string }[];
}): Promise<boolean> {
  const apiKey = process.env.POSTMARK_API_KEY;
  const from = process.env.POSTMARK_FROM || 'noreply@swisswallpanels.ch';

  if (!apiKey || apiKey.includes('your-postmark-key') || apiKey.includes('placeholder')) {
    console.log('\n--- DEVELOPMENT EMAIL SENT ---');
    console.log(`To:      ${to}`);
    console.log(`From:    ${from}`);
    console.log(`Subject: ${subject}`);
    if (attachments?.length) {
      console.log(`Attachments: ${attachments.map((a) => a.name).join(', ')}`);
    }
    console.log('--- HTML Body Snippet ---');
    console.log(htmlBody.substring(0, 1000) + '\n...');
    console.log('------------------------------\n');
    return true;
  }

  try {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': apiKey,
      },
      body: JSON.stringify({
        From: from,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: 'outbound',
        ...(attachments?.length
          ? {
              Attachments: attachments.map((a) => ({
                Name: a.name,
                Content: a.content.toString('base64'),
                ContentType: a.contentType,
              })),
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Postmark API failed with status ${response.status}: ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send email via Postmark:', error);
    return false;
  }
}

/**
 * Email wrapper style template
 */
function getEmailWrapper(contentHtml: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #F8F8F6;
          margin: 0;
          padding: 40px 15px;
          color: #1A1A1A;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #FFFFFF;
          border: 1px solid rgba(26, 26, 26, 0.08);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(26, 26, 26, 0.03);
        }
        .header {
          background-color: #1A1A1A;
          padding: 30px;
          text-align: center;
        }
        .logo {
          color: #FFFFFF;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        .logo-accent {
          color: #C8B89A;
          font-weight: 300;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .footer {
          background-color: #F8F8F6;
          border-top: 1px solid rgba(26, 26, 26, 0.05);
          padding: 20px 30px;
          text-align: center;
          font-size: 11px;
          color: rgba(26, 26, 26, 0.5);
        }
        .button {
          display: inline-block;
          background-color: #1A1A1A;
          color: #FFFFFF !important;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 14px;
          margin: 20px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .button:hover {
          background-color: #C8B89A;
        }
        .divider {
          height: 1px;
          background-color: rgba(26, 26, 26, 0.08);
          margin: 30px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(26, 26, 26, 0.6);
          border-bottom: 1px solid rgba(26, 26, 26, 0.08);
          padding-bottom: 10px;
        }
        td {
          padding: 12px 0;
          border-bottom: 1px solid rgba(26, 26, 26, 0.05);
          font-size: 14px;
        }
        .price-summary {
          margin-top: 20px;
          background-color: #F8F8F6;
          padding: 20px;
          border-radius: 4px;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .price-row.total {
          border-top: 1px solid rgba(26, 26, 26, 0.1);
          padding-top: 10px;
          margin-top: 10px;
          font-size: 16px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Swiss<span class="logo-accent">Wall</span></div>
        </div>
        <div class="content">
          ${contentHtml}
        </div>
        <div class="footer">
          <p>Swiss Wall Panels &copy; ${new Date().getFullYear()}. All rights reserved.</p>
          <p>Zürich, Switzerland | info@swisswallpanels.ch</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export const emailService = {
  /**
   * 1. Send Order Confirmation
   */
  async sendOrderConfirmation(
    order: EmailOrder,
    user: EmailUser,
    locale: string,
    invoicePdf?: Buffer | null
  ): Promise<boolean> {
    const isDe = locale.toLowerCase() === 'de';
    const isFr = locale.toLowerCase() === 'fr';
    const isSq = locale.toLowerCase() === 'sq';

    let subject = `Order Confirmation ${order.orderNumber}`;
    let heading = `Thank you for your order!`;
    let body = `We have received your order and are currently processing it. Below is your order summary.`;
    let labelProduct = 'Product';
    let labelQty = 'Qty';
    let labelTotal = 'Total';
    let labelSubtotal = 'Subtotal';
    let labelVat = 'VAT (8.1%)';
    let labelShipping = 'Shipping';
    let labelDiscount = 'Discount';
    let labelOrderTotal = 'Order Total';
    let buttonLabel = 'Download Invoice';
    let footerMessage = 'If you have any questions, feel free to contact us at any time.';

    if (isDe) {
      subject = `Bestellbestätigung ${order.orderNumber}`;
      heading = `Vielen Dank für Ihre Bestellung!`;
      body = `Wir haben Ihre Bestellung erhalten und bearbeiten diese derzeit. Nachfolgend finden Sie Ihre Bestellübersicht.`;
      labelProduct = 'Produkt';
      labelQty = 'Menge';
      labelTotal = 'Gesamt';
      labelSubtotal = 'Zwischensumme';
      labelVat = 'MWST (8.1%)';
      labelShipping = 'Versand';
      labelDiscount = 'Rabatt';
      labelOrderTotal = 'Gesamtsumme';
      buttonLabel = 'Rechnung herunterladen';
      footerMessage = 'Bei Fragen können Sie uns jederzeit kontaktieren.';
    } else if (isFr) {
      subject = `Confirmation de commande ${order.orderNumber}`;
      heading = `Merci pour votre commande!`;
      body = `Nous avons bien reçu votre commande et nous la traitons actuellement. Voici le récapitulatif de votre commande.`;
      labelProduct = 'Produit';
      labelQty = 'Qté';
      labelTotal = 'Total';
      labelSubtotal = 'Sous-total';
      labelVat = 'TVA (8.1%)';
      labelShipping = 'Frais de port';
      labelDiscount = 'Remise';
      labelOrderTotal = 'Total de la commande';
      buttonLabel = 'Télécharger la facture';
      footerMessage = 'Si vous avez des questions, n\'hésitez pas à nous contacter.';
    } else if (isSq) {
      subject = `Konfirmimi i porosisë ${order.orderNumber}`;
      heading = `Faleminderit për porosinë tuaj!`;
      body = `Kemi pranuar porosinë tuaj dhe po e përpunojmë atë. Më poshtë është përmbledhja e porosisë suaj.`;
      labelProduct = 'Produkti';
      labelQty = 'Sasia';
      labelTotal = 'Totali';
      labelSubtotal = 'Nëntotali';
      labelVat = 'TVSH (8.1%)';
      labelShipping = 'Transporti';
      labelDiscount = 'Zbritja';
      labelOrderTotal = 'Totali i porosisë';
      buttonLabel = 'Shkarko faturën';
      footerMessage = 'Nëse keni pyetje, mos hezitoni të na kontaktoni në çdo kohë.';
    }

    let itemsHtml = '';
    for (const item of order.items) {
      const variantDesc = item.variantName ? ` - ${item.variantName}` : '';
      itemsHtml += `
        <tr>
          <td><strong>${item.productName}</strong>${variantDesc}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${formatCHF(item.totalChf)}</td>
        </tr>
      `;
    }

    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">${heading}</h1>
      <p>Hello ${user.firstName} ${user.lastName},</p>
      <p>${body}</p>
      
      <div style="margin: 30px 0;">
        <strong>Order: ${order.orderNumber}</strong>
      </div>

      <table>
        <thead>
          <tr>
            <th>${labelProduct}</th>
            <th style="text-align: center; width: 60px;">${labelQty}</th>
            <th style="text-align: right; width: 100px;">${labelTotal}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="price-summary">
        <div class="price-row">
          <span>${labelSubtotal} (excl. VAT)</span>
          <span>${formatCHF(order.subtotalChf)}</span>
        </div>
        <div class="price-row">
          <span>${labelVat}</span>
          <span>${formatCHF(order.vatAmountChf)}</span>
        </div>
        <div class="price-row">
          <span>${labelShipping}</span>
          <span>${formatCHF(order.shippingCostChf)}</span>
        </div>
        ${
          order.discountAmountChf > 0
            ? `
        <div class="price-row" style="color: #d9534f;">
          <span>${labelDiscount}</span>
          <span>-${formatCHF(order.discountAmountChf)}</span>
        </div>
        `
            : ''
        }
        <div class="price-row total">
          <span>${labelOrderTotal}</span>
          <span>${formatCHF(order.totalChf)}</span>
        </div>
      </div>

      ${
        order.invoiceUrl
          ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${order.invoiceUrl}" class="button">${buttonLabel}</a>
      </div>
      `
          : ''
      }

      <div class="divider"></div>
      <p style="font-size: 13px; color: rgba(26, 26, 26, 0.6);">${footerMessage}</p>
    `;

    return sendEmail({
      to: user.email,
      subject,
      htmlBody: getEmailWrapper(contentHtml, subject),
      attachments: invoicePdf
        ? [
            {
              name: `invoice-${order.orderNumber}.pdf`,
              content: invoicePdf,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    });
  },

  /**
   * 2. Send Quote Received
   */
  async sendQuoteReceived(quote: EmailQuote): Promise<boolean> {
    // Notify customer
    const customerSubject = `We have received your quote request - ${quote.quoteNumber}`;
    const customerHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">Quote Request Received</h1>
      <p>Hello ${quote.contactName},</p>
      <p>Thank you for requesting a quote for your project. We have received your submission and our experts are currently reviewing it. We will get back to you with a detailed offer shortly.</p>
      
      <div style="background-color: #F8F8F6; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <strong>Reference Number:</strong> ${quote.quoteNumber}<br/>
        <strong>Project Description:</strong> ${quote.projectDesc}
      </div>

      <p>Our team will contact you if we need any additional details. Thank you for choosing Swiss Wall Panels!</p>
    `;

    const sendToCustomer = await sendEmail({
      to: quote.contactEmail,
      subject: customerSubject,
      htmlBody: getEmailWrapper(customerHtml, customerSubject),
    });

    // Notify Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'info@swisswallpanels.ch';
    const adminSubject = `[New Quote Request] ${quote.quoteNumber} - ${quote.contactName}`;
    const adminHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0; color: #d9534f;">New Quote Request Submitted</h1>
      <p>A new quote request has been submitted on the website.</p>
      
      <h3>Customer Details:</h3>
      <table style="border: none;">
        <tr><td style="border: none; padding: 4px 0; width: 120px;"><strong>Name:</strong></td><td style="border: none; padding: 4px 0;">${quote.contactName}</td></tr>
        <tr><td style="border: none; padding: 4px 0;"><strong>Email:</strong></td><td style="border: none; padding: 4px 0;">${quote.contactEmail}</td></tr>
        <tr><td style="border: none; padding: 4px 0;"><strong>Phone:</strong></td><td style="border: none; padding: 4px 0;">${quote.contactPhone || '-'}</td></tr>
        <tr><td style="border: none; padding: 4px 0;"><strong>Company:</strong></td><td style="border: none; padding: 4px 0;">${quote.company || '-'}</td></tr>
      </table>

      <h3>Project Details:</h3>
      <p><strong>Description:</strong> ${quote.projectDesc}</p>
      ${
        quote.roomDimensions
          ? `<p><strong>Dimensions:</strong> Width: ${quote.roomDimensions.width_m}m, Length: ${quote.roomDimensions.length_m}m, Height: ${quote.roomDimensions.height_m}m</p>`
          : ''
      }

      <h3>Requested Products:</h3>
      <ul>
        ${quote.items.map((item) => `<li>${item.productName} - Qty: ${item.quantity} ${item.note ? `(Note: ${item.note})` : ''}</li>`).join('')}
      </ul>

      <div style="margin-top: 30px;">
        <a href="${frontendPath('/admin/offerten')}" class="button">Go to Admin Dashboard</a>
      </div>
    `;

    const sendToAdmin = await sendEmail({
      to: adminEmail,
      subject: adminSubject,
      htmlBody: getEmailWrapper(adminHtml, adminSubject),
    });

    return sendToCustomer && sendToAdmin;
  },

  /**
   * 3. Send Quote Reply
   */
  async sendQuoteReply(quote: { quoteNumber: string; contactName: string; contactEmail: string }, pdfUrl: string): Promise<boolean> {
    const subject = `Your Quote from Swiss Wall Panels - ${quote.quoteNumber}`;
    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">Your Customized Offer is Ready</h1>
      <p>Hello ${quote.contactName},</p>
      <p>We are pleased to send you our customized offer for your wall panel project. We have calculated the pricing based on your specifications.</p>
      <p>You can view and download your detailed PDF offer using the link below:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${pdfUrl}" class="button">View Customized Quote (PDF)</a>
      </div>

      <p>This offer is valid for 30 days. To accept this quote or discuss modifications, simply reply to this email or call us directly.</p>
      <p>We look forward to working with you on your project!</p>
    `;

    return sendEmail({
      to: quote.contactEmail,
      subject,
      htmlBody: getEmailWrapper(contentHtml, subject),
    });
  },

  /**
   * 4. Send Password Reset
   */
  async sendPasswordReset(user: EmailUser, resetToken: string, locale: string): Promise<boolean> {
    const isDe = locale.toLowerCase() === 'de';
    const isFr = locale.toLowerCase() === 'fr';
    const isSq = locale.toLowerCase() === 'sq';

    let subject = 'Password Reset Request';
    let heading = 'Password Reset Request';
    let bodyText = 'You have requested to reset your password. Please click the button below to set a new password. This link is valid for 1 hour.';
    let buttonLabel = 'Reset Password';
    let ignoreText = 'If you did not request this, you can safely ignore this email.';

    if (isDe) {
      subject = 'Passwort zurücksetzen';
      heading = 'Passwort zurücksetzen';
      bodyText = 'Sie haben das Zurücksetzen Ihres Passworts angefordert. Bitte klicken Sie auf die Schaltfläche unten, um ein neues Passwort festzulegen. Dieser Link ist 1 Stunde gültig.';
      buttonLabel = 'Passwort zurücksetzen';
      ignoreText = 'Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail einfach ignorieren.';
    } else if (isFr) {
      subject = 'Réinitialisation du mot de passe';
      heading = 'Réinitialisation du mot de passe';
      bodyText = 'Vous avez demandé à réinitialiser votre mot de passe. Veuillez cliquer sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien est valide pendant 1 heure.';
      buttonLabel = 'Réinitialiser';
      ignoreText = 'Si vous n\'avez pas demandé cela, vous pouvez ignorer cet e-mail en toute sécurité.';
    } else if (isSq) {
      subject = 'Rivendosja e fjalëkalimit';
      heading = 'Rivendosja e fjalëkalimit';
      bodyText = 'Ju keni kërkuar të rivendosni fjalëkalimin tuaj. Ju lutemi klikoni butonin e mëposhtëm për të caktuar një fjalëkalim të ri. Ky link është i vlefshëm për 1 orë.';
      buttonLabel = 'Rivendos Fjalëkalimin';
      ignoreText = 'Nëse nuk e keni kërkuar këtë, mund ta injoroni këtë email.';
    }

    const resetUrl = `${frontendPath(`/${locale}/reset-password`)}?token=${resetToken}`;
    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">${heading}</h1>
      <p>Hello ${user.firstName} ${user.lastName},</p>
      <p>${bodyText}</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">${buttonLabel}</a>
      </div>

      <p style="font-size: 12px; color: rgba(26, 26, 26, 0.5);">${ignoreText}</p>
    `;

    return sendEmail({
      to: user.email,
      subject,
      htmlBody: getEmailWrapper(contentHtml, subject),
    });
  },

  /**
   * 5. Send Contact Auto Reply
   */
  async sendContactAutoReply(message: ContactMessage): Promise<boolean> {
    const subject = `Thank you for contacting Swiss Wall Panels`;
    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">We have received your message</h1>
      <p>Hello ${message.name},</p>
      <p>Thank you for reaching out to us. This email confirms that we have received your contact message and our team will review it. We will get back to you as soon as possible.</p>
      
      <div style="background-color: #F8F8F6; padding: 20px; border-radius: 4px; margin: 20px 0; font-size: 13px;">
        <strong>Subject:</strong> ${message.subject}<br/>
        <strong>Your Message:</strong><br/>
        <p style="font-style: italic; white-space: pre-line; margin-top: 5px;">${message.message}</p>
      </div>

      <p>Best regards,<br/>Swiss Wall Panels Team</p>
    `;

    return sendEmail({
      to: message.email,
      subject,
      htmlBody: getEmailWrapper(contentHtml, subject),
    });
  },

  async sendContactAdminNotification(message: ContactMessage): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL || 'info@swisswallpanels.ch';
    const subject = `[Contact] ${message.subject} — ${message.name}`;
    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">New contact message</h1>
      <p><strong>From:</strong> ${message.name} &lt;${message.email}&gt;</p>
      ${message.phone ? `<p><strong>Phone:</strong> ${message.phone}</p>` : ''}
      <p><strong>Subject:</strong> ${message.subject}</p>
      <div style="background-color: #F8F8F6; padding: 20px; border-radius: 4px; white-space: pre-line;">${message.message}</div>
    `;
    return sendEmail({
      to: adminEmail,
      subject,
      htmlBody: getEmailWrapper(contentHtml, subject),
    });
  },

  async sendNewsletterWelcome(email: string, locale: string): Promise<boolean> {
    const isDe = locale.toLowerCase() === 'de';
    const isFr = locale.toLowerCase() === 'fr';
    const isSq = locale.toLowerCase() === 'sq';

    let subject = 'Welcome to Swiss Wall Panels newsletter';
    let heading = 'Thank you for subscribing!';
    let body = 'You will receive updates about new products, offers, and inspiration for your spaces.';

    if (isDe) {
      subject = 'Willkommen beim Swiss Wall Panels Newsletter';
      heading = 'Vielen Dank für Ihre Anmeldung!';
      body = 'Sie erhalten Updates zu neuen Produkten, Angeboten und Inspiration für Ihre Räume.';
    } else if (isFr) {
      subject = 'Bienvenue à la newsletter Swiss Wall Panels';
      heading = 'Merci pour votre inscription!';
      body = 'Vous recevrez des nouveautés sur les produits, offres et inspirations.';
    } else if (isSq) {
      subject = 'Mirë se vini në buletinin Swiss Wall Panels';
      heading = 'Faleminderit për abonimin!';
      body = 'Do të merrni përditësime për produkte të reja, oferta dhe inspirim.';
    }

    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">${heading}</h1>
      <p>${body}</p>
    `;

    return sendEmail({
      to: email,
      subject,
      htmlBody: getEmailWrapper(contentHtml, subject),
    });
  },

  /**
   * 6. Send Low Stock Alert (to Admin)
   */
  async sendLowStockAlert(product: { nameDe: string; sku: string }, currentStock: number): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL || 'info@swisswallpanels.ch';
    const subject = `[Low Stock Alert] SKU: ${product.sku} - Only ${currentStock} left`;
    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0; color: #d9534f;">Low Stock Warning</h1>
      <p>An item is running low on stock in the warehouse. Please review inventory and reorder if necessary.</p>
      
      <table style="border: none; margin: 20px 0;">
        <tr><td style="border: none; padding: 4px 0; width: 120px;"><strong>Product Name:</strong></td><td style="border: none; padding: 4px 0;">${product.nameDe}</td></tr>
        <tr><td style="border: none; padding: 4px 0;"><strong>SKU:</strong></td><td style="border: none; padding: 4px 0;"><code>${product.sku}</code></td></tr>
        <tr><td style="border: none; padding: 4px 0;"><strong>Current Stock:</strong></td><td style="border: none; padding: 4px 0; color: #d9534f; font-weight: bold;">${currentStock} units</td></tr>
      </table>

      <div style="margin-top: 30px;">
        <a href="${frontendPath('/admin/produkte')}" class="button">Manage Products</a>
      </div>
    `;

    return sendEmail({
      to: adminEmail,
      subject,
      htmlBody: getEmailWrapper(contentHtml, subject),
    });
  },

  /**
   * 7. Send Abandoned Cart
   */
  async sendAbandonedCart(
    user: EmailUser,
    cart: { items: { productName: string; quantity: number }[] },
    locale: string
  ): Promise<boolean> {
    const isDe = locale.toLowerCase() === 'de';
    const isFr = locale.toLowerCase() === 'fr';
    const isSq = locale.toLowerCase() === 'sq';

    let subject = 'Did you leave something behind?';
    let heading = 'Your shopping cart is waiting';
    let body = 'We noticed you left some items in your shopping cart. Don\'t miss out! Return to your cart now to complete your purchase.';
    let buttonLabel = 'Return to Cart';

    if (isDe) {
      subject = 'Haben Sie etwas vergessen?';
      heading = 'Ihr Warenkorb wartet auf Sie';
      body = 'Wir haben festgestellt, dass sich noch Artikel in Ihrem Warenkorb befinden. Sichern Sie sich diese, bevor sie ausverkauft sind! Kehren Sie jetzt zum Warenkorb zurück, um Ihren Einkauf abzuschliessen.';
      buttonLabel = 'Zum Warenkorb';
    } else if (isFr) {
      subject = 'Avez-vous oublié quelque chose ?';
      heading = 'Votre panier vous attend';
      body = 'Nous avons remarqué que vous avez laissé des articles dans votre panier. Ne les laissez pas filer ! Retournez à votre panier pour finaliser votre commande.';
      buttonLabel = 'Retour au panier';
    } else if (isSq) {
      subject = 'Keni harruar diçka në shportë?';
      heading = 'Shporta juaj po ju pret';
      body = 'Kemi vënë re se keni lënë disa artikuj në shportën tuaj të blerjeve. Mos i humbisni! Kthehuni tani te shporta për të përfunduar blerjen tuaj.';
      buttonLabel = 'Kthehu te shporta';
    }

    let itemsList = '';
    for (const item of cart.items) {
      itemsList += `<li>${item.productName} (Qty: ${item.quantity})</li>`;
    }

    const cartUrl = frontendPath(`/${locale}/warenkorb`);
    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">${heading}</h1>
      <p>Hello ${user.firstName},</p>
      <p>${body}</p>
      
      <div style="background-color: #F8F8F6; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0;">Items in your cart:</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${itemsList}
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${cartUrl}" class="button">${buttonLabel}</a>
      </div>
    `;

    return sendEmail({
      to: user.email,
      subject,
      htmlBody: getEmailWrapper(contentHtml, subject),
    });
  },

  async sendEmailVerification(user: EmailUser, verifyToken: string, locale: string): Promise<boolean> {
    const isDe = locale.toLowerCase() === 'de';
    const isFr = locale.toLowerCase() === 'fr';
    const isSq = locale.toLowerCase() === 'sq';

    let subject = 'Verify your email address';
    let heading = 'Verify your email';
    let bodyText = 'Please click the button below to verify your email address and start placing orders.';
    let buttonLabel = 'Verify Email';

    if (isDe) {
      subject = 'E-Mail-Adresse bestätigen';
      heading = 'E-Mail bestätigen';
      bodyText = 'Bitte klicken Sie auf die Schaltfläche unten, um Ihre E-Mail-Adresse zu bestätigen und Bestellungen aufzugeben.';
      buttonLabel = 'E-Mail bestätigen';
    } else if (isFr) {
      subject = 'Vérifiez votre adresse e-mail';
      heading = 'Vérification e-mail';
      bodyText = 'Veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse e-mail et passer des commandes.';
      buttonLabel = "Vérifier l'e-mail";
    } else if (isSq) {
      subject = 'Verifikoni adresën tuaj të emailit';
      heading = 'Verifikimi i emailit';
      bodyText = 'Ju lutemi klikoni butonin e mëposhtëm për të verifikuar email-in tuaj dhe për të filluar porositë.';
      buttonLabel = 'Verifiko Emailin';
    }

    const verifyUrl = `${frontendPath(`/${locale}/verify-email`)}?token=${verifyToken}`;
    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">${heading}</h1>
      <p>Hello ${user.firstName} ${user.lastName},</p>
      <p>${bodyText}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" class="button">${buttonLabel}</a>
      </div>
      <p style="font-size: 12px; color: rgba(26, 26, 26, 0.5);">This link expires in 24 hours.</p>
    `;

    return sendEmail({ to: user.email, subject, htmlBody: getEmailWrapper(contentHtml, subject) });
  },

  async sendAccountLocked(user: EmailUser, unlockToken: string, locale: string): Promise<boolean> {
    const isDe = locale.toLowerCase() === 'de';
    const isFr = locale.toLowerCase() === 'fr';
    const isSq = locale.toLowerCase() === 'sq';

    let subject = 'Account Locked';
    let heading = 'Your account has been locked';
    let bodyText = 'Due to multiple failed login attempts, your account has been locked. Click the button below to unlock it. This link is valid for 24 hours.';
    let buttonLabel = 'Unlock Account';

    if (isDe) {
      subject = 'Konto gesperrt';
      heading = 'Ihr Konto wurde gesperrt';
      bodyText = 'Aufgrund mehrerer fehlgeschlagener Anmeldeversuche wurde Ihr Konto gesperrt. Klicken Sie auf die Schaltfläche unten, um es freizuschalten. Dieser Link ist 24 Stunden gültig.';
      buttonLabel = 'Konto freischalten';
    } else if (isFr) {
      subject = 'Compte verrouillé';
      heading = 'Votre compte a été verrouillé';
      bodyText = 'En raison de plusieurs tentatives de connexion échouées, votre compte a été verrouillé. Cliquez sur le bouton ci-dessous pour le déverrouiller. Ce lien est valide pendant 24 heures.';
      buttonLabel = 'Déverrouiller le compte';
    } else if (isSq) {
      subject = 'Llogaria u bllokua';
      heading = 'Llogaria juaj është bllokuar';
      bodyText = 'Për shkak të përpjekjeve të shumta të dështuara për të hyrë, llogaria juaj është bllokuar. Klikoni butonin e mëposhtëm për ta zhbllokuar atë. Ky link është i vlefshëm për 24 orë.';
      buttonLabel = 'Zhblloko Llogarinë';
    }

    const unlockUrl = `${frontendPath(`/${locale}/unlock-account`)}?token=${unlockToken}`;
    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">${heading}</h1>
      <p>Hello ${user.firstName} ${user.lastName},</p>
      <p>${bodyText}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${unlockUrl}" class="button">${buttonLabel}</a>
      </div>
      <p style="font-size: 12px; color: rgba(26, 26, 26, 0.5);">This link expires in 24 hours.</p>
    `;

    return sendEmail({ to: user.email, subject, htmlBody: getEmailWrapper(contentHtml, subject) });
  },

  async sendNewOrderAdminAlert(
    order: EmailOrder,
    customer: EmailUser & { phone?: string | null }
  ): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL || 'info@swisswallpanels.ch';
    const subject = `[New Order] ${order.orderNumber} - ${customer.firstName} ${customer.lastName}`;

    let itemsHtml = '';
    for (const item of order.items) {
      itemsHtml += `<li>${item.productName}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity} - ${formatCHF(item.totalChf)}</li>`;
    }

    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0; color: #d9534f;">New Order Received</h1>
      <p>A customer has placed a new order on the website.</p>
      <h3>Customer:</h3>
      <p>${customer.firstName} ${customer.lastName}<br/>${customer.email}<br/>${customer.phone || '-'}</p>
      <h3>Order ${order.orderNumber}</h3>
      <ul>${itemsHtml}</ul>
      <p><strong>Total:</strong> ${formatCHF(order.totalChf)}</p>
      <div style="margin-top: 30px;">
        <a href="${frontendPath('/admin/orders')}" class="button">View in Admin</a>
      </div>
    `;

    return sendEmail({ to: adminEmail, subject, htmlBody: getEmailWrapper(contentHtml, subject) });
  },

  async sendOrderStatusUpdate(
    user: EmailUser,
    data: { orderNumber: string; status: string; note: string },
    _locale: string
  ): Promise<boolean> {
    const subject = `Order Update - ${data.orderNumber}`;
    const contentHtml = `
      <h1 style="font-size: 20px; font-weight: normal; margin-top: 0;">Order Status Update</h1>
      <p>Hello ${user.firstName},</p>
      <p>Your order <strong>${data.orderNumber}</strong> has been updated.</p>
      <p><strong>Status:</strong> ${data.status}</p>
      <div style="background-color: #F8F8F6; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <strong>Message from our team:</strong><br/>
        ${data.note}
      </div>
    `;

    return sendEmail({ to: user.email, subject, htmlBody: getEmailWrapper(contentHtml, subject) });
  },
};
