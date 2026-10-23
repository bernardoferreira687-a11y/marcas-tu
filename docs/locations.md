# Índice de localidades de Portugal

O autocomplete usa uma cópia local dos municípios e localidades postais de Portugal, incluindo continente, Açores e Madeira. Não faz pedidos a uma API durante a pesquisa. Uma localidade pesquisável não implica que já existam restaurantes de demonstração nesse local.

## Fonte, atribuição e limites

- Compilação: **Central de Dados — Códigos postais de Portugal**, editada por Ricardo Lafuente: <https://github.com/centraldedados/codigos_postais>.
- Origem declarada: ficheiros disponibilizados pelos **CTT**. O projeto não recolhe nem inclui ruas, clientes, portas ou códigos postais no índice final; usa os nomes das localidades e as respetivas referências geográficas.
- Revisão importada: `e49281814d07ee3feda27b1f1954ac263ca42b21`, atualização dos dados de **16 de fevereiro de 2020**. A importação é reproduzível, mas não implica atualização diária dos dados postais.
- Licença declarada pelo publicador: **PDDL-1.0**, <https://opendatacommons.org/licenses/pddl/1-0/>. O README da fonte explica que a republicação assenta na presunção de caráter público da informação. Esta atribuição preserva a declaração e a ressalva da fonte; não representa uma verificação jurídica independente dos direitos dos CTT.
- `concelhos.csv` contém os **308 municípios**. O índice inclui as localidades presentes na versão importada dos dados postais, não promete uma lista oficial atualizada de todas as povoações portuguesas nem atribui estatuto de cidade ou vila.
- A coluna `distrito` da fonte agrupa os 18 distritos continentais e também 11 ilhas. Nos objetos da API, `district` preserva esse nome geográfico, incluindo `Ilha de São Miguel`, por exemplo. Só os 18 distritos reais aparecem como opções do tipo `district`. `region` é derivada dos códigos CTT: `01`–`18` → `Continente`; `31`–`32` → `Madeira`; `41`–`49` → `Açores`.

Localidades repetidas por rua ou cliente são deduplicadas dentro do município. Quando o nome coincide com o do município, a opção municipal representa também essa localidade. Localidades homónimas em municípios distintos são conservadas com labels como `Santo André, Barreiro` e `Santo André, Mangualde`. As designações municipais da fonte são preservadas, incluindo `Lagoa (Algarve)` e `Lagoa (São Miguel)`.

## Formato e API

`src/locations-data.json` guarda tuplos compactos para não repetir dezenas de milhares de vezes os mesmos nomes de municípios/distritos e as labels. O ficheiro inclui os metadados de origem, o commit e os SHA-256 das três entradas originais. As listas têm o formato:

- `districts`: `[código, nome geográfico CTT, região]`;
- `municipalities`: `[código distrito+concelho, nome]`;
- `localities`: `[código distrito+concelho, código localidade CTT, nome]`.

`src/locations.js` expõe:

```js
searchLocations('santo andre barreiro', { limit: 8 });
getLocationById('municipality:1106'); // Lisboa
findExactLocation('Ericeira, Mafra');
```

Os resultados têm `{ id, name, label, type, municipality, district, region }`; `type` é `municipality`, `locality` ou `district`. `municipality` é `null` nas opções de distrito. IDs de municípios/distritos derivam dos códigos da fonte; IDs de localidades combinam município e código localidade. `locations` exporta o índice completo para inspeção local.

A pesquisa ignora acentos, maiúsculas e espaços exteriores, ordena coincidências exatas e prefixos antes de correspondências geográficas e pesquisa também o município, distrito/ilha e região. A pesquisa vazia começa por sugestões editoriais de municípios existentes, sem alegar uma classificação de popularidade. O limite predefinido é 8, podendo ser aumentado pelo consumidor.

`getLocationById` e `findExactLocation` devolvem `null` quando não há correspondência. Um nome incompleto não é uma seleção válida. Um nome homónimo de localidade, como `Santo André`, não escolhe uma opção arbitrariamente; deve ser fornecida uma label desambiguada ou um ID. Um nome municipal canónico, como `Lisboa`, seleciona o município.

## Reproduzir e atualizar

Não são necessárias bibliotecas Python adicionais. A partir da raiz do repositório:

```sh
python3 scripts/update-locations.py
npm test
```

O script descarrega as três entradas públicas da revisão fixada por HTTPS e verifica os SHA-256 antes de gerar o JSON. Não precisa de credenciais CTT ou GitHub. Também pode usar uma cópia previamente descarregada:

```sh
python3 scripts/update-locations.py --source-dir /caminho/dos/csv
python3 scripts/update-locations.py --source-dir /caminho/dos/csv --check
```

Para atualizar a origem, reveja primeiro o novo commit, os metadados, a licença e a cobertura da fonte. Atualize intencionalmente `SOURCE_COMMIT` e os SHA-256 no script depois de verificar os três ficheiros dessa revisão; regenere o índice e execute os testes. Não desative TLS ou a verificação de checksums para contornar uma falha. A geração falha se um município for desconhecido, um identificador estiver inválido ou a lista não contiver 308 municípios.
