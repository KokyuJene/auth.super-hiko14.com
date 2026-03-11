module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://auth.super-hiko14.com');
  res.json({ status: 'ok' });
};
