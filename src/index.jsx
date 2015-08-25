import React from 'react';
import superagent from 'superagent';
import Promise from 'bluebird';
import _ from 'lodash';
import url from 'url';

const DEFAULT_TIMEOUT = 10000;

const methods = ['get', 'post', 'put', 'delete'];
const $methods = _(methods)
  .map((method) => [method, Symbol(method)])
  .object()
.value();

class UnknownHTTPTypeError extends TypeError {
  constructor(method, ...rest) {
    super(`Unknown HTTP method type: ${method}`, ...rest);
  }
}

function request(method, href, params = {}, opts = {}, mw = []) {
  const timeout = opts.timeout || DEFAULT_TIMEOUT;
  const req = _.reduce(mw, (r, f) => r.use(f), (() => {
    if(method === 'post') {
      return superagent.post(href).type('json').send(params);
    }
    if(method === 'put') {
      return superagent.put(href).type('json').send(params);
    }
    if(method === 'get') {
      return superagent.get(href).accept('application/json').query(params);
    }
    if(method === 'delete') {
      return superagent.del(href).accept('application/json').query(params);
    }
    throw new UnknownHTTPTypeError(method);
  })());
  return new Promise((resolve, reject) => req.end((err, { error, body } = {}) => {
    if(err || error) {
      return reject(err || error);
    }
    return resolve(body);
  }))
  .cancellable()
  .timeout(timeout)
  .catch(Promise.CancellationError, () => {
    req.abort();
  })
  .catch(Promise.TimeoutError, (err) => {
    req.abort();
    throw err;
  });
}

function expand({ protocol, hostname, port, prefix }, pathname) {
  return url.resolve(url.format({
    protocol,
    hostname,
    port,
    pathname: prefix,
  }), pathname);
}

function http(getHTTPBindings, config = {}) {
  return (Component) => {
    const EnhancedComponent = Object.assign(class extends Component {}, _.mapValues($methods, ($method, method) =>
      function $request(pathname, params = {}) {
        return request(method, expand(config, pathname), params, config, config);
      }
    ));
    return class extends React.Component {

      render() {
        const { props, state } = this;
        return <EnhancedComponent {...props} {...state} />;
      }
    };
  };
}

export default Object.assign(
  http,
  // $get, $post, $put, $delete
  _($methods).map(($method, method) => [`$${method}`, $method]).object().value(),

  // get, post, put, delete
  _(methods).map((method) => [
    method,
    (pathname, params) => [method, params, pathname],
  ]).object().value()
);
