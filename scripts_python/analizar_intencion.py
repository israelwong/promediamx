import spacy
import sys
import json

nlp = spacy.load("es_core_news_sm")  # Asegúrate de descargar el modelo correcto

texto = sys.argv[1]
doc = nlp(texto)

precio_keywords = ["precio", "costo", "valor", "tarifa"]  # Palabras clave esenciales
soporte_keywords = ["soporte", "ayuda", "asistencia", "problema"]
intencion = "general"

# 1. Análisis Sintáctico (para casos específicos)
for token in doc:
    if token.lemma_ in ["dar", "mostrar", "informar", "consultar", "decir"] and token.head.lemma_ in ["precio", "costo", "valor"]:
        intencion = "consulta_precio"
        break
    elif token.lemma_ in ["necesitar", "querer", "tener"] and any(word in token.subtree.text for word in soporte_keywords):
        intencion = "solicitar_soporte"
        break

# 2. Palabras Clave (para reforzar y casos simples)
if intencion == "general":  # Si no se detectó por sintaxis
    if any(word in texto for word in precio_keywords):
        intencion = "consulta_precio"
    elif any(word in texto for word in soporte_keywords):
        intencion = "solicitar_soporte"

if intencion == "general" and "hola" in texto.lower(): # Casos muy simples
    intencion = "saludo"

# Puedes agregar lógica más compleja aquí para mejorar la detección

resultados = {
  "intencion": intencion,
  "tokens": [{"text": token.text, "pos": token.pos_} for token in doc] # Ejemplo de información adicional
}

print(json.dumps(resultados))