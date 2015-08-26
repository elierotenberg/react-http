import React from 'react';
import http, { get, post, $post, $ok, $err, $pending } from '../..';

const config = {
  protocol: 'https',
  hostname: 'localhost',
  port: 8888,
  prefix: 'api',
};

@http((props) => ({
  pingProps: post('/ping', { id: props.id }),
  user42: get('/users/42'),
  users: get('/users'),
}), config)
export default class extends React.Component {
  static displayName = 'TestComponent';

  static propTypes = {
    id: React.PropTypes.any,
    pingProps: http.propType.isRequired,
    user42: http.propType.isRequired,
    users: http.propType.isRequired,
  };

  reping() {
    const { props } = this;
    this[$post]('/ping', { id: props.id });
  }

  render() {
    const countUsers = (([$status, value]) => {
      if($status === $ok) {
        return value.length;
      }
      if($status === $err) {
        return `Error(${value})`;
      }
      if($status === $pending) {
        return `...`;
      }
    })(this.props.users);
    return <div>
      {countUsers}
      {JSON.stringify(this.props, null, 2)}
    </div>;
  }
}
