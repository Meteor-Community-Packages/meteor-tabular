import Tabular from "../common/Tabular.js";

Tinytest.add('Sanitize - clear data of an array object', function (test) {
  const data = [{
    name: `<script>alert("xss")</script>`,
    surname: 'doe'
  }]

  const sanitizedData = Tabular.sanitize(data);

  LogResults(data, "&lt;script>alert(&quot;xss&quot;)&lt;/script>", sanitizedData[0].name, test)
})
