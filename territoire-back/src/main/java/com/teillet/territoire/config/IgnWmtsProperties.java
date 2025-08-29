package com.teillet.territoire.config;


import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "map.ign")
public class IgnWmtsProperties {
    /**
     * Base WMTS URL, ex: <a href="https://data.geopf.fr/wmts">lien IGN</a>
     */
    private String wmtsBase;

    /**
     * Layer, ex: GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2
     */
    private String layer;

    /**
     * Style, ex: normal
     */
    private String style;

    /**
     * Format, ex: image/png ou image/jpeg
     */
    private String format;
}