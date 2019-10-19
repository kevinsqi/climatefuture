import React from 'react'
import Head from 'next/head'
import Nav from '../components/nav'

function Home() {
  return (
    <div>
      <Head>
        <title>Climate Change Projections</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <Nav />

      <div>
        <h1>LocalClimate</h1>

        <form>
          <input type="text" />
        </form>
      </div>
    </div>
  )
}

export default Home
