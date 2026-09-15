const MODES = new Set(['inherit', 'direct', 'custom']);
function validateNetworkProxy(value) {
  if (!value || !MODES.has(value.mode)) throw new Error('Invalid proxy mode');
  if (value.mode !== 'custom') return { mode: value.mode, url: '' };
  if (typeof value.url !== 'string' || value.url.length > 2048 || /[\r\n]/.test(value.url)) throw new Error('Invalid proxy address');
  let url;
  try { url = new URL(value.url.trim()); } catch { throw new Error('Use an HTTP proxy address, for example http://127.0.0.1:7890'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password
    || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Use an HTTP/HTTPS proxy without credentials, path, query or fragment');
  }
  return { mode: 'custom', url: url.origin };
}
function proxyEnvironment(value, inherited) {
  const proxy = validateNetworkProxy(value);
  const env = { ...inherited };
  if (proxy.mode !== 'inherit') for (const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy']) delete env[key];
  const bypass = ['localhost','127.0.0.1','::1',...(env.NO_PROXY || '').split(','),...(env.no_proxy || '').split(',')].filter(Boolean);
  env.NO_PROXY = env.no_proxy = [...new Set(bypass)].join(',');
  if (proxy.mode === 'custom') {
    env.HTTP_PROXY = env.HTTPS_PROXY = env.http_proxy = env.https_proxy = proxy.url;
  }
  return env;
}
function electronProxyConfig(value) {
  const proxy = validateNetworkProxy(value);
  if (proxy.mode === 'inherit') return undefined;
  if (proxy.mode === 'direct') return {mode:'direct'};
  return {mode:'fixed_servers', proxyRules:proxy.url, proxyBypassRules:'localhost,127.0.0.1,[::1]'};
}
module.exports = { validateNetworkProxy, proxyEnvironment, electronProxyConfig };
