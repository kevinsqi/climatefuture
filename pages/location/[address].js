import React from 'react';
import Head from 'next/head';
import Nav from '../../components/nav';

import { useRouter } from 'next/router';
import fetch from 'isomorphic-unfetch';
import queryString from 'query-string';

const DEFAULT_YEAR = 2080;

function celsiusToFahrenheitDiff(diff) {
  const num = Number(diff);
  return `${num > 0 ? '▲' : '▼'} ${((num * 9) / 5).toFixed(1)}° F`;
}

function DataNumber({ label, value }) {
  return (
    <div>
      <div className="small font-weight-bold text-secondary">{label}</div>
      <div style={{ fontSize: 25 }}>{value}</div>
    </div>
  );
}

function Temperature(props) {
  const { year_start, year_end, model_26_warming, model_85_warming } = props.result;
  return (
    <div>
      <h3>Temperature</h3>
      <div className="row">
        <div className="col-6">
          <DataNumber
            label="Best case (RCP 2.6)"
            value={celsiusToFahrenheitDiff(model_26_warming)}
          />
        </div>
        <div className="col-6">
          <DataNumber
            label="Best case (RCP 2.6)"
            label="Worst case (RCP 8.5)"
            value={celsiusToFahrenheitDiff(model_85_warming)}
          />
        </div>
      </div>
    </div>
  );
}

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
            className="col-4"
            style={{ position: 'sticky', background: 'rgb(234, 234, 234)', height: '100vh' }}
          >
            <div className="px-3 py-4">
              <div className="text-secondary" style={{ textTransform: 'uppercase', fontSize: 13 }}>
                Local Climate Projections
              </div>
              <form className="mt-1" onSubmit={onSubmit}>
                <input
                  className="form-control"
                  type="text"
                  value={address}
                  placeholder="City, address, or zip"
                  onChange={(event) => setAddress(event.target.value)}
                />
              </form>
              <h2 className="mt-3 font-weight-bold" style={{ fontSize: '1.6em' }}>
                {geo.formatted_address}
              </h2>
              <hr />
              <div>
                {[2040, 2060, 2080, 2100].map((year) => {
                  return (
                    <a
                      className={Number(query.year) === year ? 'font-weight-bold' : ''}
                      style={{ color: '#444', fontSize: '1.2em' }}
                      href={`/location/${query.address}?year=${year}`}
                    >
                      <div>{year}</div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="col-8">
            <div className="px-4 py-4">
              {results.map((result) => {
                if (result.attribute === 'temperature_increase') {
                  return <Temperature result={result} />;
                }
                return <pre>{JSON.stringify(result, null, 4)}</pre>;
              })}
            </div>
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
