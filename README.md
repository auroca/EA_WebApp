# Exercici: Mapa general de rutes amb cerques geoespacials

## Descripció

S'ha implementat un mapa general de rutes on es poden seleccionar zones representades com a polígons. En seleccionar una zona, el frontend envia les coordenades del polígon al backend i es busquen les rutes que tenen punts dins d'aquesta àrea.

## Estat de l'exercici

L'exercici està operatiu.

## Parts implementades

- S'ha afegit un camp geoespacial `location` al model `Point`.
- El camp `location` utilitza format GeoJSON `Point`.
- S'ha creat un índex `2dsphere` sobre `location`.
- S'ha implementat l'endpoint `POST /routes/inside-polygon`.
- El backend utilitza `$geoWithin` per trobar punts dins del polígon seleccionat.
- El frontend mostra un mapa amb zones i les rutes trobades dins de cada zona.
  
## Conclusió

La funcionalitat principal està implementada: el mapa permet seleccionar una zona i realitzar una cerca geoespacial per trobar punts de ruta dins del polígon, retornant les rutes associades.
