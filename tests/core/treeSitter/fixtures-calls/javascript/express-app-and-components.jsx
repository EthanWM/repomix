const express = require('express');
import { render } from 'react-dom';

const app = express();
app.use(express.json());

app.get('/users', async (req, res) => {
  const users = await db.users.findAll({ limit: 10 });
  res.json(users.map(serialize));
});

class UserList extends Component {
  static defaultProps = { users: [] };

  handleClick = (id) => {
    this.props.onSelect(id);
  };

  render() {
    return (
      <Layout title="Users">
        {this.props.users.map((u) => <UserRow key={u.id} user={u} onClick={this.handleClick} />)}
        <div className="footer"><Pager.Next /></div>
      </Layout>
    );
  }
}

function* ids() {
  yield nextId();
}

describe('UserList', () => {
  const helper = () => setup();
  it('renders', () => {
    expect(render(<UserList />)).toBeTruthy();
  });
});

module.exports = { app, UserList };
app.listen(process.env.PORT || 3000, () => console.log('listening'));
