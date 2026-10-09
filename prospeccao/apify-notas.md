# Apify — o que foi confirmado (2026-10-09)

Ator `compass/crawler-google-places`, testado com 5 barbearias do Kobrasol (São José) e o detalhe de uma delas.

- **Saldo:** `GET /v2/users/me/limits` → `data.limits.maxMonthlyUsageUsd` (5) e `data.current.monthlyUsageUsd`. O ciclo mensal começa no dia 9.
- **Atraso no registro de gasto:** o uso do mês e as cobranças de uma execução aparecem só alguns segundos ou minutos depois do fim dela. Logo após o fim, os dois mostram zero. Por isso o gasto registrado pelo projeto é estimado: quantidades × preços abaixo.
- **Teto por execução:** `maxTotalChargeUsd` tem mínimo de US$0,50. Abaixo disso a API responde 400 `max-total-charge-usd-below-minimum`.
- **Idioma:** `pt-BR` é aceito. Os dias da semana vêm em português e os horários em inglês: `{ "day": "sexta-feira", "hours": "09:00 to 20:00" }`.
- **Telefone:** `phone` = `+55 48 99950-5167`; `phoneUnformatted` = `+5548999505167`.
- **Campos que já vêm sem página de detalhe:** title, placeId, address, neighborhood, city, phone, phoneUnformatted, website, totalScore, reviewsCount, categoryName, openingHours, location, url, searchString, permanentlyClosed, temporarilyClosed, imageUrl.
- **Detalhes por ID:** `placeIds: [...]` funciona. Avaliações têm `name`, `text` e `stars`. As fotos vêm em `imageUrls` com sufixo `=w1920-h1080-k-no`; trocar o sufixo por `=w1200` devolve um JPEG de 200–400 KB.
- **Preços (plano grátis):** lugar US$0,004; página de detalhe +US$0,002; avaliação US$0,0005; foto US$0,0005; início de execução US$0,00005; filtro pago US$0,001 por lugar. O `skipClosedPlaces` conta como filtro pago, então não é usado: os fechados são descartados no nosso código.
- **Medido:** busca de 5 lugares = US$0,0252 (ainda com `skipClosedPlaces`); detalhe de 1 lugar com 2 fotos e 2 avaliações = US$0,0082.
- **Estimativa por lote:** descoberta de ~80 lugares (US$0,32) + detalhes de 25 com 5 avaliações e 4 fotos cada (US$0,26) ≈ US$0,58. O crédito grátis rende uns 8 lotes por mês.
- **Amostra:** 4 das 5 barbearias tinham como "site" Trinks, Instagram, WhatsApp ou Linktree, e 1 não tinha site.
