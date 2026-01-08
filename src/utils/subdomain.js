// ============================================================================
// SUBDOMAIN UTILITIES - Detecção e gerenciamento de subdomínios
// ============================================================================

/**
 * Obtém o subdomínio atual da URL
 * @returns {string|null} O subdomínio ou null se não houver
 */
export function getSubdomain() {
  const hostname = window.location.hostname;

  // Localhost não tem subdomínio real, mas podemos simular
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Verificar se há um parâmetro de query para simular subdomínio em dev
    const params = new URLSearchParams(window.location.search);
    const subdomainParam = params.get('subdomain');

    // Se tem o parametro na URL, salva no sessionStorage
    if (subdomainParam) {
      sessionStorage.setItem('dev_subdomain', subdomainParam);
      return subdomainParam;
    }

    // Se não tem na URL, verifica no sessionStorage
    return sessionStorage.getItem('dev_subdomain') || null;
  }

  // Dividir o hostname em partes
  const parts = hostname.split('.');

  // Se tiver 3 ou mais partes (ex: admin.app.com), o primeiro é o subdomínio
  // Se tiver 2 partes (ex: app.com), não há subdomínio
  if (parts.length >= 3) {
    // Verificar se não é www (que não consideramos subdomínio)
    const subdomain = parts[0];
    if (subdomain !== 'www') {
      return subdomain;
    }
  }

  return null;
}

/**
 * Verifica se está no subdomínio de admin
 * @returns {boolean}
 */
export function isAdminSubdomain() {
  const subdomain = getSubdomain();
  return subdomain === 'administracao' || subdomain === 'painel';
}

/**
 * Obtém a URL base sem o subdomínio
 * @returns {string}
 */
export function getMainDomain() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:${window.location.port}`;
  }

  const parts = hostname.split('.');

  // Se tiver subdomínio, remover
  if (parts.length >= 3 && parts[0] !== 'www') {
    parts.shift();
  }

  return `${protocol}//${parts.join('.')}`;
}

/**
 * Obtém a URL do admin
 * @returns {string}
 */
export function getAdminUrl() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:${window.location.port}?subdomain=administracao`;
  }

  const parts = hostname.split('.');

  // Remover subdomínio existente se houver
  if (parts.length >= 3 && parts[0] !== 'www') {
    parts.shift();
  }

  return `${protocol}//administracao.${parts.join('.')}`;
}

/**
 * Redireciona para o domínio principal
 */
export function redirectToMain() {
  window.location.href = getMainDomain();
}

/**
 * Redireciona para o admin
 */
export function redirectToAdmin() {
  window.location.href = getAdminUrl();
}

export default {
  getSubdomain,
  isAdminSubdomain,
  getMainDomain,
  getAdminUrl,
  redirectToMain,
  redirectToAdmin,
};
