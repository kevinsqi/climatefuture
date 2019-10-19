import { useRouter } from 'next/router';
import fetch from 'isomorphic-unfetch';
import queryString from 'query-string';

export default function Location(props) {
  const { place_name, observed_warming, model_26_warming, model_85_warming } = props.temperature;
  return (
    <div>
      <h2>{place_name}</h2>
      <div>Observed warming: {observed_warming}</div>
      <div>RCP 2.6: {model_26_warming}</div>
      <div>RCP 8.5: {model_85_warming}</div>
    </div>
  );
}

Location.getInitialProps = async function(context) {
  const { address } = context.query;
  const paramString = queryString.stringify({ address });

  const response = await fetch(`http://localhost:3001/api/location?${paramString}`);
  const data = await response.json();
  return {
    temperature: data.temperature,
  };
};
