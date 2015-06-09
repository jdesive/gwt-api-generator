package com.vaadin.components.gwt.polymer.client.sampler.iron;

import com.google.gwt.core.client.GWT;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HTMLPanel;
import com.vaadin.components.gwt.polymer.client.widget.IronCollapse;

public class IronSelectorSample extends Composite {
    interface SampleUiBinder extends UiBinder<HTMLPanel, IronSelectorSample> {
    }

    private static SampleUiBinder ourUiBinder = GWT.create(SampleUiBinder.class);

    public IronSelectorSample() {
        initWidget(ourUiBinder.createAndBindUi(this));
    }
}