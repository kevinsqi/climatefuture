import React from 'react';
import Head from 'next/head';
import Nav from '../../components/nav';

import { useRouter } from 'next/router';
import fetch from 'isomorphic-unfetch';
import queryString from 'query-string';

const DEFAULT_YEAR = 2080;

export default function Location({ geo, results, query }) {
  const [address, setAddress] = React.useState('');
  console.log(geo, results, query);

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
        <link
          rel="stylesheet"
          href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"
        />
      </Head>

      <div className="container-fluid">
        <div className="row">
          <div
            className="col-md-3"
            style={{ position: 'sticky', background: 'rgb(234, 234, 234)' }}
          >
            <div>Local Climate Projections</div>
            <form onSubmit={onSubmit}>
              <input
                className="form-control"
                type="text"
                value={address}
                placeholder="City, address, or zip"
                onChange={(event) => setAddress(event.target.value)}
              />
            </form>
            <h2>{geo.formatted_address}</h2>
            <hr />
            <div>
              {[2040, 2060, 2080, 2100].map((year) => {
                return (
                  <a
                    className={Number(query.year) === year ? 'font-weight-bold' : ''}
                    href={`/location/${query.address}?year=${year}`}
                  >
                    <div>{year}</div>
                  </a>
                );
              })}
            </div>
          </div>
          <div className="col-md-9">
            {results.map((result) => {
              return <pre>{JSON.stringify(result, null, 4)}</pre>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Location.getInitialProps = async function(context) {
  const query = {
    address: context.query.address.replace('-', ' '),
    year: context.query.year || DEFAULT_YEAR,
  };
  const paramString = queryString.stringify(query);

  const response = await fetch(`http://localhost:3001/api/location?${paramString}`);
  const data = await response.json();
  console.log('Data:', data.results);
  return {
    query: query,
    geo: data.geo,
    results: data.results,
  };
};
