# Camouflage and Name-based Virtual Hosting via Fallbacks with SNI

VLESS is a very light protocol which, like Trojan, does not perform complex encryption and obfuscation of traffic. Instead, encrypted by the TLS protocol, it disguised itself as HTTPS, going in and out of GFW. For better camouflage against active detection, Fallbacks comes with VLESS. This tutorial will demonstrate how to use Fallbacks in VLESS or Trojan inbound protocol in Xray with Nginx or Caddy to achieve name-based virtual hosting while ensuring perfect camouflage.

## Applications

When XTLS is enabled, Xray needs to listen on port 443, which causes that you can't run your websites and Xray at the same time. Certainly, websites can be run on another port, but it's inappropriate obviously. There are three solutions to the problem.

- Xray Listening on other common ports (e.g. 22, 3389, 8443)

  This solution is the simplest, but not perfect.

- Nginx or HAProxy listening on port 443 and processing L4 reverse proxy through SNI shunt to achieve port reuse

  This solution is more complex and requires necessary experience in using Nginx or HAProxy, so I won't talk concerning it too much here.

- Xray listening on port 443, using Fallbacks with SNI shunt to forward website traffic to Nginx or Caddy

  This is a moderately difficult solution. I will demonstrate it in the following tutorial.

## A brief introduction of SNI

**S**erver **N**ame **I**ndication is an extension to the TLS protocol. Those familiar with reverse proxy know that if you want to proxy traffic to the correct content via a domain name, the following configuration is required.

```nginx
proxy_set_header Host hostname;
```

This can set the HTTP header named "Host" to a certain hostname, but why? Generally speaking, when there is only one IP address on a server which, however,  runs more than one website, the server can't directly present the correct sites to visitors. To solve the issue, name-based virtual hosting was developed. When receiving a request, the server looks up the request's Host header to give the visitor access to the correct website.

Everything seems perfect until HTTP protocol is encrypted by TLS protocol. When using HTTPS, the TLS handshake happens before the server sees any HTTP headers. Therefore, it was not possible for the server to use the information in the HTTP Host header to decide which certificate to present, much less to determine visitors' access destinations.

SNI addresses this issue by having the client send the name of the virtual domain as part of the TLS negotiation's ClientHello message. This allows a server to present multiple certificates on the same IP address and TCP port number and hence allows multiple secure (HTTPS) websites (or any other service over TLS) to be served by the same IP address without requiring all those sites to use the same certificate. It is the conceptual equivalent to HTTP/1.1 name-based virtual hosting, but for HTTPS. This also allows a proxy to forward client traffic to the right server during TLS/SSL handshake.[^1]

## Thinking

![Xray Fallbacks flow](./fallbacks-with-sni-resources/xray-fallbacks.svg)

After receiving traffic from port 443, Xray forwards TLS decrypted traffic with first packet length < 18, invalid protocol version or authentication failure to the address specified by `dest` according to `name`, `path`, `alpn` options.[^2]

## Add a DNS record

![DNS records](./fallbacks-with-sni-resources/xray-dns-records.webp)

Please change the domain name and IP according to your actual situation.

## Apply for a TLS certificate
 
Since the domain names with different prefixes are to be shunted, but the scope of a wildcard certificate is limited to two "." (e.g., if you issue a cert for `*.example.com`, `example.com` or `*. *.example.com` do not match it.), so you need to apply for a [SAN](https://en.wikipedia.org/wiki/Subject_Alternative_Name) wildcard certificate. According to the official website of Let's Encrypt [^3], the application of wildcard certificate requires DNS-01 authentication method. Here we demonstrate that the domain name with NS record of Cloudflare applies for free TLS certificate of Let's Encrypt through [acme.sh](https://acme.sh). Please read [dnsapi - acmesh-official/acme.sh Wiki](https://github.com/acmesh-official/acme.sh/wiki/dnsapi) for the application method using other domain name hosting providers.[^4]

First of all, you need to go to [Cloudflare panel](https://dash.cloudflare.com/profile/api-tokens) to create an API Token. The parameters are as follows.

![Permissions for the API Token](./fallbacks-with-sni-resources/cf-api-token-permissions-for-acme.webp)

Settings of permissions are of significant, while the rest is arbitrary.

Once created, you will be given a string of mystery characters that you should keep in a safe place where it will not be lost, as it will no longer be displayed. This string of characters is the `CF_Token` that you will use later.

::: warning
Note: The following commands need to be done under the root user, using sudo will cause an error.
:::

```bash
curl https://get.acme.sh | sh # install acme.sh
export CF_Token="sdfsdfsdfsdfljlbjjkljlkjsdfoiwje" # set the API Token variable
acme.sh --issue -d example.com -d *.example.com --dns dns_cf # use DNS-01 authentication to request a certificate
mkdir /etc/ssl/xray # create a new  directory to store certificates
acme.sh --install-cert -d example.com --fullchain-file /etc/ssl/xray/cert.pem --key-file /etc/ssl/xray/privkey.key --reloadcmd " chown nobody:nogroup -R /etc/ssl/xray && systemctl restart xray" # install certificates to the specified directory and set the auto-renewal command to take effect
```

# Xray configuration

```json
{
    "log": {
        "loglevel": "warning"
    },
    "inbounds": [
        {
            "port": 443,
            "protocol": "vless",
            "settings": {
                "clients": [
                    {
                        "id": "UUID",
                        "flow": "xtls-rprx-direct"
                    }
                ],
                "decryption": "none",
                "fallbacks": [
                    {
                        "name": "example.com",
                        "path": "/vmessws",
                        "dest": 5000, // other Xray inbound protocol
                        "xver": 1
                    },
                    {
                        "dest": 5001, // default camouflage website
                        "xver": 1
                    },
                    {
                        "alpn": "h2",
                        "dest": 5002, // default camouflage website, with HTTP/2
                        "xver": 1
                    },
                    {
                        "name": "blog.example.com",
                        "dest": 5003, // other website, shunted by domain
                        "xver": 1
                    },
                    {
                        "name": "blog.example.com",
                        "alpn": "h2",
                        "dest": 5004, // other website, shunted by domain, with HTTP/2
                        "xver": 1
                    }
                ]
            },
            "streamSettings": {
                "network": "tcp",
                "security": "xtls",
                "xtlsSettings": {
                    "alpn": [
                        "h2",
                        "http/1.1"
                    ],
                    "certificates": [
                        {
                            "certificateFile": "/etc/ssl/xray/cert.pem",
                            "keyFile": "/etc/ssl/xray/privkey.key"
                        }
                    ]
                }
            }
        },
        {
            "listen": "127.0.0.1",
            "port": 5000,
            "protocol": "vmess",
            "settings": {
                "clients": [
                    {
                        "id": "UUID"
                    }
                ]
            },
            "streamSettings": {
                "network": "ws",
                "wsSettings": {
                    "acceptProxyProtocol": true,
                    "path": "/vmessws"
                }
            }
        }
    ],
    "outbounds": [
        {
            "protocol": "freedom"
        }
    ]
}
```

The above configuration is specific to Nginx, and here are some details to keep in mind.

- About Proxy Protocol

  The Proxy Protocol was designed to chain proxies / reverse-proxies without losing the client information.[^5] While traditional methods tend to be complex and restrictive, Proxy Protocol solves this problem by making it very simple to transfer data with packets of information about the original connection quaternion.[^6]

  There are pros and cons to everything, and the same is true for Proxy Protocol.

  - Both endpoints of the connection MUST be compatible with proxy protocol[^5]
  - The same port cannot be compatible with both connections with Proxy Protocol data and connections without data (e.g., Nginx with different virtual hosts (servers) on the same port, essentially the previous one)[^6]

  In case of exceptions, consider whether the configuration meets the above conditions.

  Here, we use Proxy Protocol to let the upstream which is forwarded to get the real IP of the client.

  Additionally, ReadV will fail when `"acceptProxyProtocol": true` is present.[^7]

- About HTTP/2

  The reason for using HTTP/2 is that it can bring a better visit experience to website visitors. However, if you just want to make a disguise and don't really use the website, you are able to delete all the HTTP/2 configuration. For more details on the HTTP/2 protocol, please visit [Wikipedia](https://en.wikipedia.org/wiki/HTTP/2).

  The following are detailed information about HTTP/2 configuration.

  First of all, `inbounds.streamSettings.xtlsSettings.alpn` is sequential, with `h2` first and `http/1.1` second, to ensure compatibility while prioritizing HTTP/2; the reverse order will cause HTTP/2 to become HTTP/1.1 when negotiated, making it invalid configuration.

  In the above configuration, each configuration that falls back to Nginx has to be split into two. This is because h2 is a mandatory TLS-encrypted HTTP/2 connection, which is good for the security of data traveling over the Internet but is not necessary inside the server, and h2c is a non-encrypted HTTP/2 connection, which is appropriate for that environment. However, Nginx cannot listen to both HTTP/1.1 and h2c on the same port. To work around this, you need to specify the `alpn` option in `fallbacks` (not the option in `xtlsSettings`) to try to match the TLS ALPN negotiation result.

    It is recommended that the `alpn` option be filled in only in two ways as needed:[^2]

    - Omit
    - `"h2"`

  If you use Caddy, you don't have to do so much work, because it **can** listen to both HTTP/1.1 and h2c on the same port, with the following configuration changes.

  ```json
  "fallbacks": [
      {
          "name": "example.com",
          "path": "/vmessws",
          "dest": 5000, // other Xray inbound protocol
          "xver": 1
      },
      {
          "dest": 5001, // default camouflage website, regardless of HTTP edition
          "xver": 1
      },
      {
          "name": "blog.example.com",
          "dest": 5002, // other website, regardless of HTTP edition
          "xver": 1
      }
  ]
  ```

## Nginx configuration

Nginx will be installed from the official prebuilt repository.

```bash
sudo apt install curl gnupg2 ca-certificates lsb-release
echo "deb [arch=amd64] http://nginx.org/packages/ubuntu `lsb_release -cs` nginx" \
    | sudo tee /etc/apt/sources.list.d/nginx.list
curl -fsSL https://nginx.org/keys/nginx_signing.key | sudo apt-key add -
sudo apt update
sudo apt install nginx
```

Delete `/etc/nginx/conf.d/default.conf` and create `/etc/nginx/conf.d/fallbacks.conf`. The contents are as follows.

```nginx
set_real_ip_from 127.0.0.1;
real_ip_header proxy_protocol;

server {
    listen 127.0.0.1:5001 proxy_protocol default_server;
    listen 127.0.0.1:5002 proxy_protocol default_server http2;

    location / {
        root /srv/http/default;
    }
}

server {
    listen 127.0.0.1:5003 proxy_protocol;
    listen 127.0.0.1:5004 proxy_protocol http2;

    server_name blog.example.com;

    location / {
        root /srv/http/blog.example.com;
    }
}

server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

## Caddy configuration

To install Caddy, please refer to [Install - Caddy Documentation](https://caddyserver.com/docs/install).

In order for Caddy to get the real IP of your visitors, you need to compile Caddy with the Proxy Protocol module, which is recommended to be compiled online directly from the Caddy official website.

```bash
sudo curl -o /usr/bin/caddy "https://caddyserver.com/api/download?os=linux&arch=amd64&p=github.com%2Fmastercactapus%2Fcaddy2-proxyprotocol&idempotency=79074247675458"
sudo chmod +x /usr/bin/caddy
```

Just replace it directly.

> It is recommended to install Caddy via the official documentation first and then replace the binaries. Doing so eliminates the need to manually set up a daemon.

Edit `/etc/caddy/Caddyfile`.

 ```Caddyfile
{
    servers 127.0.0.1:5001 {
        listener_wrappers {
            proxy_protocol
        }
        protocol {
            allow_h2c
        }
    }
    servers 127.0.0.1:5002 {
        listener_wrappers {
            proxy_protocol
        }
	protocol {
            allow_h2c
        }
    }
}

:5001 {
    root * /srv/http/default
    file_server
    log 
    bind 127.0.0.1
}

http://blog.example.com:5002 {
    root * /srv/http/blog.example.com
    file_server
    log
    bind 127.0.0.1
}

:80 {
    redir https://{host}{uri} permanent
}
```

## References

[^1]: [Server Name Indication - Wikipedia](https://en.wikipedia.org/wiki/Server_Name_Indication)

[^2]: [v2fly-github-io/vless.md at master · rprx/v2fly-github-io](https://github.com/rprx/v2fly-github-io/blob/master/docs/config/protocols/vless.md)

[^3]: [FAQ - Let's Encrypt - Free SSL/TLS Certificates](https://letsencrypt.org/docs/faq/)

[^4]: [Home · acmesh-official/acme.sh Wiki](https://github.com/acmesh-official/acme.sh/wiki)

[^5]: [Proxy Protocol - HAProxy Technologies](https://www.haproxy.com/blog/haproxy/proxy-protocol/)

[^6]: [proxy protocol介绍及nginx配置 - 简书](https://www.jianshu.com/p/cc8d592582c9)

[^7]: [By @AkinoKaede, in *Add fallbacks with SNI tutorial and update some documents by BioniCosmos · Pull Request #64 · XTLS/XTLS.github.io*](https://github.com/XTLS/XTLS.github.io/pull/64#discussion_r585248494)
