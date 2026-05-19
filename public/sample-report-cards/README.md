# Sample report cards

This folder holds pre-rendered PDF report cards used by the demo (`Reports` admin page).
Filenames are `student-{studentId}.pdf` to match the URL produced by `ReportMockApi`.

To regenerate from the backend, run:

```
GET http://localhost:8081/api/reports/student/{studentId}/exam/{examId}
```

with a valid `Authorization: Bearer …` header, then save the response into this folder.

FUTURE: once the real backend is wired (via AWS API Gateway) we delete this folder
because `ReportHttpApi.reportCardUrl()` will point straight at the backend URL.
