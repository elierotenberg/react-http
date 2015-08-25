import React from 'react';
import http, { get, post, $post } from '../..';

const config = {
  protocol: 'https',
  hostname: 'localhost',
  port: 8888,
  prefix: 'api',
};

@http((props) => ({
  users: get('/users'),
  user42: get('/users/42'),
  pingProps: post('/ping', { id: props.id }),
}), config)
export default class extends React.Component {
  static displayName = 'TestComponent';

  static propTypes = {
    pingProps: React.PropTypes.function.isRequired,
    user42: React.PropTypes.object,
    users: React.PropTypes.array,
  };

  reping() {
    const { props } = this;
    this[$post]('/ping', { id: props.id });
  }

  render() {
    return <div>
      {JSON.stringify(this.props, null, 2)}
    </div>;
  }
}
