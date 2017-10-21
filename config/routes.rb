Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root                         to: 'caption#index'
  post    '/receiver',         to: 'caption#receiver'
  get     '/ping_result',      to: 'caption#ping'
end
