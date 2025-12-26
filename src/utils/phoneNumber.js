/**
 * Normalise un numéro de téléphone au format international
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Supprimer tous les caractères non numériques
  let cleaned = phone.replace(/\D/g, '');
  
  // Si le numéro commence par 0, le remplacer par le code pays (ex: 33 pour la France)
  if (cleaned.startsWith('0')) {
    cleaned = '33' + cleaned.substring(1);
  }
  
  // Si le numéro ne commence pas par un code pays, ajouter 33 par défaut
  if (cleaned.length === 9) {
    cleaned = '33' + cleaned;
  }
  
  return cleaned;
}

/**
 * Convertit un numéro en JID WhatsApp
 */
function toJID(phone, isGroup = false) {
  if (!phone) return null;
  
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return null;
  
  if (phone.includes('@')) {
    return phone; // Déjà un JID
  }
  
  const suffix = isGroup ? '@g.us' : '@s.whatsapp.net';
  return `${normalized}${suffix}`;
}

/**
 * Extrait le numéro d'un JID
 */
function fromJID(jid) {
  if (!jid) return null;
  return jid.split('@')[0];
}

/**
 * Valide un numéro de téléphone
 */
function isValidPhoneNumber(phone) {
  if (!phone) return false;
  
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return false;
  
  // Un numéro international doit avoir entre 10 et 15 chiffres
  return normalized.length >= 10 && normalized.length <= 15;
}

module.exports = {
  normalizePhoneNumber,
  toJID,
  fromJID,
  isValidPhoneNumber
};

