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

const $ok = Symbol('ok');
const $err = Symbol('err');
const $pending = Symbol('pending');

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
  .catch(Promise.TimeoutError, Promise.CancellationError, (err) => {
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

function propType(props, propName, componentName, isRequired = false) {
  const prop = props[propName];
  if(!prop && isRequired) {
    return new Error(`Expecting non undefined http request result.`);
  }
  if(!_.isArray(prop)) {
    return new Error(`Expecting [$status, ...] for http request result, ${prop} is not an Array.`);
  }
  const [$status] = prop;
  if(!$status) {
    return new Error(`Expecting [$status, ...] for http request result, ${prop} has no $status.`);
  }
  if(!_.contains([$ok, $err, $pending], $status)) {
    return new Error(`Expecting [$status, ...] for http request result, ${$status} is not a known status.`);
  }
}

Object.assign(propType, {
  isRequired(props, propName, componentName) {
    return propType(props, propName, componentName, true);
  },
});

function http(getHTTPBindings, config = {}) {
  return (Component) => {
    const EnhancedComponent = Object.assign(class extends Component {}, _.mapValues($methods, ($method, method) =>
      function $request(pathname, params = {}) {
        return request(method, expand(config, pathname), params, config, config);
      }
    ));
    return class extends React.Component {
      constructor(props, ...rest) {
        super(props, ...rest);
        this.state = _(getHTTPBindings(props))
          .map(([method, params, pathname], key) => {
            request(method, expand(config, pathname), params, config, config)
            .then((res) => this.setState({ [key]: [$ok, res] }))
            .catch((err) => {
              this.setState({ [key]: [$err, err] });
              throw err;
            });
            return [key, [$pending, void 0]];
          })
          .object()
        .value();
      }

      render() {
        const { props, state } = this;
        return <EnhancedComponent
          {...props}
          {...state}
        />;
      }
    };
  };
}

export default Object.assign(
  http,
  {
    $ok,
    $err,
    $pending,
    propType,
  },
  // $get, $post, $put, $delete
  _($methods).map(($method, method) => [`$${method}`, $method]).object().value(),
  // get, post, put, delete
  _(methods).map((method) => [
    method,
    (pathname, params) => [method, params, pathname],
  ]).object().value()
);
