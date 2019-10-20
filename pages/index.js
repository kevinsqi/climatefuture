import React from 'react';
import Head from 'next/head';
import Nav from '../components/nav';

function Home() {
  const [address, setAddress] = React.useState('');

  function onSubmit(event) {
    event.preventDefault();
    // TODO: better string cleansing?
    window.location = `/location/${address.replace(' ', '-')}`;
  }

  return (
    <div>
      <Head>
        <title>Climate Change Projections</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Nav />

      <div>
        <h1>Local climate change</h1>

        <form onSubmit={onSubmit}>
          <input
            type="text"
            value={address}
            placeholder="City, address, or zip"
            onChange={(event) => setAddress(event.target.value)}
          />
        </form>
      </div>
    </div>
  );
}

export default Home;
