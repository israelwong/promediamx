"use client";
import CardServicio from "./CardServicio";

function Servicios() {
  return (
    <div>

        <CardServicio
          title={"Funnel de ventas"}
          description={
            "Ayudamos a los negocios a diseñar su ecosistema digital para su embudo de venta de punta a punta agregando valor en cada etapa."
          }
          btn_id={"btn_funnel"}
          btn_title={"Más información"}
          btn_message={"Me interesa diseñar mi funnel de ventas"}
          url_video={
            "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/clips/funnel-480.webm"
          }
        />


        <CardServicio
          title={"Producción de video"}
          description={
            "Producimos medios audio visuales atractivos que enganchen a su audiencia en cualquier red social (Fotografía, video, motion graphics 2D, diseño gráfico)."
          }
          btn_id={"btn_produccion"}
          btn_title={"Más información"}
          btn_message={
            "Me interesa más información sobre producción audiovisual"
          }
          url_video={
            "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/clips/produccion-480.webm"
          }
          position="right"
        />


        <CardServicio
          title={"Campañas digitales"}
          description={
            "Diseñamos e implementamos campañas de branding, marketing y remarketing que te ayuden maximizar tus objetivos y resultados."
          }
          btn_id={"btn_campanas"}
          btn_title={"Más información"}
          btn_message={
            "Me interesa más información sobre las campañas de branding, marketing y remarketing"
          }
          url_video={
            "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/clips/produccion-480.webm"
          }
        />



        <CardServicio
          title={"Flujos conversacionales"}
          description={
            "Implementamos flujos conversacionales automatizados 24/7 en todos los canales de comunicación."
          }
          btn_id={"btn_automatizacion"}
          btn_title={"Más información"}
          btn_message={
            "Me interesa más información sobre la automatización de las conversaciones 24/7"
          }
          url_video={
            "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/clips/automatizacion-480.webm"
          }
          position="right"
        />


        <CardServicio
          title={"Asistentes virtuales"}
          description={
            "Entrenamos e integramos asistentes virtuales conversacionales para la resolución de preguntas frecuentes a través de IA."
          }
          btn_id={"btn_chatbots"}
          btn_title={"Más información"}
          btn_message={
            "Me interesa más información sobre implementar un asistente virtual con IA"
          }
          url_video={
            "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/clips/atencion-480.webm"
          }
        />
 

        <CardServicio
          title={"Diseño de sitios web"}
          description={
            "Creamos paginas web estáticas y dinámicas responsivas de carga rápida con tecnologías de última generación."
          }
          btn_id={"btn_web"}
          btn_title={"Más información"}
          btn_message={
            "Me interesa más información sobre el diseño de sitios web"
          }
          url_video={
            "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/clips/web-480.webm"
          }
          position="right"
        />

      <CardServicio
          title={"Pasarela de pago"}
          description={
            "Implementamos pasarela de pagos en línea (TCTD/SPEI/OXXO) con opción a ofrecer suscripciones y hasta 24 MSI."
          }
          btn_id={"btn_pasarela"}
          btn_title={"Más información"}
          btn_message={
            "Me interesa más información sobre la implementación de una pasarela de pago para mi negocio"
          }
          url_video={
            "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/clips/pasarela-480.webm"
          }
        />

    </div>
  );
}

export default Servicios;
