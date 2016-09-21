import electron from 'electron';
import React from 'react';
import ReactDOM from 'react-dom';
import LiveManagerPage from './pages/LiveManagerPage';

React.render(
  <LiveManagerPage />,
  document.getElementById('app')
);
