const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateNetworkProxy,proxyEnvironment,electronProxyConfig}=require('../electron/network-proxy.cjs');
test('proxy endpoints reject credentials, unsupported schemes and malformed inputs',()=>{
 for(const url of ['socks5://localhost:1080','http://u:p@host:12','http://host/path','http://host?token=x','http://host#x','http://host\n:80','garbage']) {
  assert.throws(()=>validateNetworkProxy({mode:'custom',url}));
 }
 assert.deepEqual(validateNetworkProxy({mode:'custom',url:' http://127.0.0.1:7890/ '}),{mode:'custom',url:'http://127.0.0.1:7890'});
 assert.throws(()=>validateNetworkProxy({mode:'unknown'}));
});
test('all modes keep loopback out of environment proxies without changing parent input',()=>{
 const inherited={HTTPS_PROXY:'http://old:8080',ALL_PROXY:'socks5://old:1080',no_proxy:'internal',PRIVATE:'preserved'};
 const copy=JSON.stringify(inherited);
 for(const mode of ['inherit','direct','custom']) {
  const env=proxyEnvironment({mode,url:'http://127.0.0.1:7890'},inherited);
  for(const host of ['localhost','127.0.0.1','::1','internal']) assert.ok(env.NO_PROXY.split(',').includes(host));
  assert.equal(env.NO_PROXY,env.no_proxy);assert.equal(env.PRIVATE,'preserved');
  if(mode==='inherit') assert.equal(env.HTTPS_PROXY,inherited.HTTPS_PROXY);
  if(mode==='direct') assert.equal(env.HTTPS_PROXY,undefined);
  if(mode==='custom') {assert.equal(env.HTTPS_PROXY,'http://127.0.0.1:7890');assert.equal(env.http_proxy,env.HTTPS_PROXY);assert.equal(env.ALL_PROXY,undefined);}
 }
 assert.equal(JSON.stringify(inherited),copy);
});
test('browser proxy modes retain system defaults or explicitly override them',()=>{
 assert.equal(electronProxyConfig({mode:'inherit'}),undefined);
 assert.deepEqual(electronProxyConfig({mode:'direct'}),{mode:'direct'});
 assert.deepEqual(electronProxyConfig({mode:'custom',url:'http://localhost:7890'}),{mode:'fixed_servers',proxyRules:'http://localhost:7890',proxyBypassRules:'localhost,127.0.0.1,[::1]'});
});
