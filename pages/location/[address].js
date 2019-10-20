import React from 'react';
import Head from 'next/head';
import Nav from '../../components/nav';

import { useRouter } from 'next/router';
import fetch from 'isomorphic-unfetch';
import queryString from 'query-string';

const YEAR = 2080;

export default function Location(props) {
  return (
    <div>
      <Head>
        <title>Climate Change Projections</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Nav />

      <div>
        <h2>{props.geo.formatted_address}</h2>
        <div>Year: {YEAR}</div>

        {props.results.map((result) => {
          return <div>{JSON.stringify(result)}</div>;
        })}
      </div>
    </div>
  );
}

Location.getInitialProps = async function(context) {
  const { address } = context.query;
  const paramString = queryString.stringify({ address: address.replace('-', ' '), year: YEAR });

  const response = await fetch(`http://localhost:3001/api/location?${paramString}`);
  const data = await response.json();
  console.log('Data:', data.results);
  return {
    geo: data.geo,
    results: data.results,
  };
};
