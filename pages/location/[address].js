import React from 'react';
import Head from 'next/head';
import Nav from '../../components/nav';

import { useRouter } from 'next/router';
import fetch from 'isomorphic-unfetch';
import queryString from 'query-string';

const DEFAULT_YEAR = 2080;

const SCENARIOS = {
  RCP_26: 'Best case',
  RCP_45: 'Moderate case',
  RCP_85: 'Worst case',
};

function Methodology(props) {
  return (
    <div className={props.className}>
      <div className="small text-secondary">
        <div>
          <strong>Methodology</strong>
        </div>
        <div>
          "{SCENARIOS.RCP_26}" uses RCP 2.6, "{SCENARIOS.RCP_45}" uses RCP 4.5, and "
          {SCENARIOS.RCP_85}" uses RCP 8.5.
        </div>
        <div>
          <a
            className="text-secondary"
            href="https://github.com/kevinsqi/climate-change-projections-server"
          >
            View source code.
          </a>{' '}
          <a
            className="text-secondary"
            href="https://github.com/kevinsqi/climate-change-projections-server/tree/master/data"
          >
            View data sources.
          </a>
        </div>
      </div>
    </div>
  );
}

function FloodingSection(props) {
  const { coastal_flooding_single_year_5ft } = props.results;
  if (!coastal_flooding_single_year_5ft) {
    return null;
  }
  const { rcp26, rcp45, rcp85 } = coastal_flooding_single_year_5ft;
  return (
    <div className={props.className}>
      <h3 className="font-weight-bold" style={{ fontSize: '2.2em' }}>
        🌊 Coastal flooding
      </h3>
      <div className="mt-4">
        <div className="row">
          <div className="col-4">
            <DataNumber label={SCENARIOS.RCP_26} value={`${Math.round(rcp26 * 100)}% chance`} />
          </div>
          <div className="col-4">
            <DataNumber label={SCENARIOS.RCP_45} value={`${Math.round(rcp45 * 100)}% chance`} />
          </div>
          <div className="col-4">
            <DataNumber label={SCENARIOS.RCP_85} value={`${Math.round(rcp85 * 100)}% chance`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PrecipitationSection(props) {
  const { num_dry_days } = props.results;
  if (!num_dry_days) {
    return null;
  }
  const {
    rcp45_weighted_mean,
    rcp45_weighted_mean_2019,
    rcp85_weighted_mean,
    rcp85_weighted_mean_2019,
  } = num_dry_days;
  const unit = 'dry days';
  return (
    <div className={props.className}>
      <h3 className="font-weight-bold" style={{ fontSize: '2.2em' }}>
        🌧️ Precipitation
      </h3>
      <div className="mt-4">
        <div className="row">
          <div className="col-4">
            <DataNumber label={SCENARIOS.RCP_26} value="--" />
          </div>
          <div className="col-4">
            <DataNumber
              label={SCENARIOS.RCP_45}
              value={formatNumberChange(rcp45_weighted_mean - rcp45_weighted_mean_2019, unit)}
              description={`Relative to 2019 projection of ${rcp45_weighted_mean_2019} days`}
            />
          </div>
          <div className="col-4">
            <DataNumber
              label={SCENARIOS.RCP_85}
              value={formatNumberChange(rcp85_weighted_mean - rcp85_weighted_mean_2019, unit)}
              description={`Relative to 2019 projection of ${rcp85_weighted_mean_2019} days`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTempChange(diff) {
  const num = Number(diff);
  return `${num > 0 ? '▲' : '▼'} ${((num * 9) / 5).toFixed(1)}° F`;
}

function formatNumberChange(diff, unit) {
  const num = Number(diff);
  return `${num > 0 ? '▲' : '▼'} ${num.toFixed(1)} ${unit}`;
}

function DataNumber({ label, value, description }) {
  return (
    <div>
      <div className="small text-secondary font-weight-bold">{label}</div>
      <div style={{ fontSize: 25 }}>{value}</div>
      <div className="small text-secondary">{description}</div>
    </div>
  );
}

function NumDaysAbove100F(props) {
  if (!props.result) {
    return null;
  }
  const {
    rcp45_weighted_mean,
    rcp45_weighted_mean_2019,
    rcp85_weighted_mean,
    rcp85_weighted_mean_2019,
  } = props.result;
  const unit = 'days >100°F';
  return (
    <div className="row">
      <div className="col-4">
        <DataNumber value="--" />
      </div>
      <div className="col-4">
        <DataNumber
          value={formatNumberChange(rcp45_weighted_mean - rcp45_weighted_mean_2019, unit)}
          description={`Relative to 2019 projection of ${rcp45_weighted_mean_2019} days`}
        />
      </div>
      <div className="col-4">
        <DataNumber
          value={formatNumberChange(rcp85_weighted_mean - rcp85_weighted_mean_2019, unit)}
          description={`Relative to 2019 projection of ${rcp85_weighted_mean_2019} days`}
        />
      </div>
    </div>
  );
}

function DataHeader(props) {
  return (
    <div className="row">
      <div className="col-4">
        <DataNumber label={SCENARIOS.RCP_26} />
      </div>
      <div className="col-4">
        <DataNumber label={SCENARIOS.RCP_45} />
      </div>
      <div className="col-4">
        <DataNumber label={SCENARIOS.RCP_85} />
      </div>
    </div>
  );
}

function Temperature(props) {
  if (!props.result) {
    return null;
  }
  const {
    year_start,
    year_end,
    model_26_warming,
    model_45_warming,
    model_85_warming,
  } = props.result;
  return (
    <div className="row">
      <div className="col-4">
        <DataNumber value={formatTempChange(model_26_warming)} />
      </div>
      <div className="col-4">
        <DataNumber value={formatTempChange(model_45_warming)} />
      </div>
      <div className="col-4">
        <DataNumber value={formatTempChange(model_85_warming)} />
      </div>
    </div>
  );
}

function TemperatureSection(props) {
  const { temperature_increase, num_days_above_100f } = props.results;
  if (!temperature_increase && !num_days_above_100f) {
    return null;
  }
  // TODO: methodology
  const showAdvice =
    num_days_above_100f &&
    num_days_above_100f.rcp85_weighted_mean - num_days_above_100f.rcp85_weighted_mean_2019 > 10;
  return (
    <div>
      <h3 className="font-weight-bold" style={{ fontSize: '2.2em' }}>
        🔥 Temperature
      </h3>
      <div className="mt-4">
        <DataHeader />
        <Temperature result={temperature_increase} />
        <div className="mt-2">
          <NumDaysAbove100F result={num_days_above_100f} />
        </div>
      </div>
      {showAdvice && (
        <div className="mt-5">
          <div className="small text-secondary font-weight-bold">How can I prepare?</div>
          <div className="mt-2" style={{ fontSize: '1.3em', fontWeight: 600 }}>
            <div>Insulate windows.</div>
            <div>Install temporary window reflectors.</div>
            <div>Install cool or green roofs.</div>
            <div>Support planting trees to provide shade and cooler air.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ geo, query }) {
  const [address, setAddress] = React.useState(query.address);

  function onSubmit(event) {
    event.preventDefault();
    // TODO: better string cleansing?
    window.location = `/location/${address.replace(' ', '-')}`;
  }

  return (
    <div className="d-flex flex-column px-3 py-4" style={{ height: '100%' }}>
      <div style={{ flex: 1 }}>
        <div className="text-secondary" style={{ textTransform: 'uppercase', fontSize: 13 }}>
          Local Climate Projections
        </div>
        <form className="mt-2" onSubmit={onSubmit}>
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
        <div className="text-secondary" style={{ textTransform: 'uppercase', fontSize: 13 }}>
          Projections for
        </div>
        <div className="mt-1">
          {[2040, 2060, 2080, 2099].map((year) => {
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
  );
}

export default function Location({ geo, results, query }) {
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
            className="col-4 col-lg-3"
            style={{ position: 'sticky', background: 'rgb(234, 234, 234)', minHeight: '100vh' }}
          >
            <Sidebar geo={geo} query={query} />
          </div>
          <div className="col-8 col-lg-9">
            <div className="px-4 py-4">
              <TemperatureSection results={results} />
              <div style={{ marginTop: 60 }}>
                <FloodingSection results={results} />
              </div>
              <div style={{ marginTop: 60 }}>
                <PrecipitationSection results={results} />
              </div>
              <div style={{ marginTop: 60 }}>
                <hr />
              </div>
              <Methodology className="mt-4" />
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
    results: data.results.reduce((obj, result) => {
      obj[result.attribute] = result;
      return obj;
    }, {}),
  };
};
